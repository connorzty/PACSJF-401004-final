const Marketplace = artifacts.require("Marketplace");

contract('Marketplace', (accounts) => {
    let marketplace;

    before(async () => {
        marketplace = await Marketplace.deployed();
    });

    describe('Marketplace Deployment', async () => {
        it('deploys successfully', async () => {
            const address = await marketplace.address;
            assert.notEqual(address, 0x0, "Contract address should not be 0x0");
            assert.notEqual(address, '', "Contract address should not be empty");
            assert.notEqual(address, null, "Contract address should not be null");
            assert.notEqual(address, undefined, "Contract address should not be undefined");
        });
    });

    describe('Products Management', async () => {
        it('allows a user to add a product', async () => {
            let result = await marketplace.addProduct('iPhone 11', 'image-link', web3.utils.toWei('1', 'Ether'), { from: accounts[0] });
            let productCount = await marketplace.productCount();
            assert.equal(productCount.toNumber(), 1, "productCount should be 1 after adding a product");

            const event = result.logs[0].args;
            assert.equal(event.id.toNumber(), productCount.toNumber(), "Product ID should match");
            assert.equal(event.name, 'iPhone 11', "Product name should match");
            assert.equal(event.image, 'image-link', "Product image should match");
            assert.equal(event.price, web3.utils.toWei('1', 'Ether'), "Product price should match");
        });

        it('allows a user to purchase a product', async () => {
            // 获取卖家余额
            let oldBalance = new web3.utils.BN(await web3.eth.getBalance(accounts[0]));
            
            // 购买产品
            let result = await marketplace.purchaseProduct(1, { from: accounts[1], value: web3.utils.toWei('1', 'Ether') });
            
            // 获取交易的gas费用
            const tx = await web3.eth.getTransaction(result.tx);
            const gasUsed = new web3.utils.BN(result.receipt.gasUsed);
            const gasPrice = new web3.utils.BN(tx.gasPrice);
            const gasCost = gasUsed.mul(gasPrice);

            // 获取卖家新余额
            let newBalance = new web3.utils.BN(await web3.eth.getBalance(accounts[0]));

            // 计算购买金额
            let productPrice = new web3.utils.BN(web3.utils.toWei('1', 'Ether'));
            let expectedBalance = oldBalance.add(productPrice).sub(gasCost);

            assert.equal(newBalance.toString(), expectedBalance.toString(), "Seller's balance should increase by the product price minus gas costs");
        });

        it('allows a user to update order status', async () => {
            await marketplace.updateOrderStatus(1, 1, { from: accounts[0] });

            let product = await marketplace.products(1);
            assert.equal(product.orderStatus.toNumber(), 1, "Order status should be updated to 'shipped'");
        });
    });
});
