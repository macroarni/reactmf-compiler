const fs = require('fs');
const {getJsonPath} = require('./utils');

const MF_DEFAULT_SHELL_JSON_PATH = 'mf.default.json';
const MF_SHELL_JSON_PATH = 'mf.json';
const APP_MF_LINK = '__MF_CLIENT_LINK__';

const DEFAULT_JSON = require(getJsonPath(MF_DEFAULT_SHELL_JSON_PATH));
const MF_JSON_PATH = getJsonPath(MF_SHELL_JSON_PATH);

const exec = (data) =>
    fs.readFile(MF_JSON_PATH, "utf8", () => (
    fs.writeFile(
        MF_JSON_PATH,
        JSON.stringify(data, null, 2),
        (err) => err && console.error(err)
    )
));

module.exports = () => {
    const data = process.argv[3] === "prod"
        ? {
            ...DEFAULT_JSON,
            dependencies: Object.assign({},
                ...Object
                    .keys(DEFAULT_JSON.dependencies)
                    .map(dependency => ({
                        [dependency]: `[window.${APP_MF_LINK}.${dependency}]/${dependency}.js`
                    }))
            )
        } : DEFAULT_JSON;

    fs.existsSync(MF_JSON_PATH)
        ? fs.stat(MF_JSON_PATH, (err) =>
            err
                ? console.error(err)
                : fs.unlink(
                    MF_JSON_PATH,
                    (err) =>
                        err
                            ? console.error(err)
                            : exec(data)
                )
        )
        : exec(data);
};
