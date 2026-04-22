const fs = require("fs");
const path = require("path");

const Marketplace = artifacts.require("Marketplace");

module.exports = async function(deployer) {
    await deployer.deploy(Marketplace);

    const artifactSource = path.join(__dirname, "..", "build", "contracts", "Marketplace.json");
    const artifactDestination = path.join(
        __dirname,
        "..",
        "marketplace-dapp",
        "src",
        "Marketplace.json"
    );

    if (fs.existsSync(artifactSource)) {
        fs.copyFileSync(artifactSource, artifactDestination);
    }
};
