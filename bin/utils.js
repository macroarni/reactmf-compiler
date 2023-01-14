const path = require("path");

const getJsonPath = (jsonPath) => path.join(process.cwd(), jsonPath);

module.exports = {
    getJsonPath
};
