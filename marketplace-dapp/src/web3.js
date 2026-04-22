import Web3 from 'web3';

let web3Instance;

export function getWeb3() {
    if (web3Instance) {
        return web3Instance;
    }

    if (typeof window !== 'undefined' && window.ethereum) {
        web3Instance = new Web3(window.ethereum);
        return web3Instance;
    }

    if (typeof window !== 'undefined' && window.web3) {
        web3Instance = new Web3(window.web3.currentProvider);
        return web3Instance;
    }

    web3Instance = new Web3('http://127.0.0.1:7545');
    return web3Instance;
}

export async function requestAccounts() {
    const web3 = getWeb3();

    if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
    }

    return web3.eth.getAccounts();
}
