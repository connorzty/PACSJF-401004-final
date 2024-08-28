import Web3 from 'web3';

let web3;

if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
        // 请求用户授权
        window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
        console.error("User denied account access");
    }
} else if (window.web3) {
    // 如果已安装MetaMask则使用其提供的Web3实例
    web3 = new Web3(window.web3.currentProvider);
} else {
    // 如果没有安装MetaMask，使用本地的HTTP provider连接
    const provider = new Web3.providers.HttpProvider("http://localhost:7545");
    web3 = new Web3(provider);
}

export default web3;
