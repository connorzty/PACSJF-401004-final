import MarketplaceArtifact from './Marketplace.json';
import { getWeb3 } from './web3';

export async function getMarketplaceContract(
    web3Instance = getWeb3(),
    artifact = MarketplaceArtifact
) {
    const networkId = await web3Instance.eth.net.getId();
    const deployedNetwork = artifact.networks?.[networkId];

    if (!deployedNetwork?.address) {
        throw new Error(
            `Marketplace contract is not deployed on network ${networkId}. Run truffle migrate and refresh the app.`
        );
    }

    return new web3Instance.eth.Contract(artifact.abi, deployedNetwork.address);
}
