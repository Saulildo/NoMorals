const undici = require("undici");
const fs = require("fs");
const path = require("path");

const NAMES = require("./names.json");
const NAMEREGEX = new RegExp(`^(${NAMES.first.join("|")})(${NAMES.last.join("|")})\\d\\d?0?$`, "");

const downloadsFolder = path.join(__dirname, "downloads");

if (!fs.existsSync(downloadsFolder)) {
    fs.mkdirSync(downloadsFolder);
}

if (!fs.existsSync(path.join(downloadsFolder, "cache.json"))) {
    fs.writeFileSync(path.join(downloadsFolder, "cache.json"), JSON.stringify({}));
}
const cache = require(path.join(downloadsFolder, "cache.json"));

let totalGenerated = 0; // To estimate how many alts have been generated

(async () => {
    while (true) {
        const name = NAMES.first[Math.floor(Math.random() * NAMES.first.length)] + NAMES.last[Math.floor(Math.random() * NAMES.last.length)];

        let users = await undici.request(`https://www.roblox.com/search/users/results?maxRows=100&keyword=${name}`);
        users = await users.body.json();

        if (!users.UserSearchResults) continue;
        for (const user of users.UserSearchResults) {
            if (user.Name.match(NAMEREGEX)) {
                let groups = await undici.request(`https://groups.roblox.com/v1/users/${user.UserId}/groups/roles`);
                groups = await groups.body.json();

                if (!groups.data) continue;
                for (const group of groups.data) {
                    let cursor = "";

                    while (true) {
                        let groupUsers = await undici.request(`https://groups.roblox.com/v1/groups/${group.group.id}/roles/${group.role.id}/users?limit=100&sortOrder=Desc&cursor=${cursor}`);
                        groupUsers = await groupUsers.body.json();

                        if (!groupUsers.data) break;
                        for (const groupUser of groupUsers.data) {
                            let res = groupUser.username.match(NAMEREGEX);
                            if (!res) continue;
                            if ((cache[res[1]] || (cache[res[1]] = [])).includes(groupUser.username)) continue;
                            cache[res[1]].push(groupUser.username);
                            fs.appendFileSync(path.join(downloadsFolder, "alts.txt"), `${groupUser.username}:${groupUser.username.split("").reverse().join("")}\n`);
                            totalGenerated++; // Increment the count of generated alts
                        }

                        if (!groupUsers.nextPageCursor) break;
                        cursor = groupUsers.nextPageCursor;
                    }
                }
            }
        }
    }
})();

process.on("SIGINT", () => {
    fs.writeFileSync(path.join(downloadsFolder, "cache.json"), JSON.stringify(cache));
    console.log(`Estimated total alts generated: ${totalGenerated}`);
    process.exit(0);
});
                     
