const Marketplace = artifacts.require('Marketplace');

contract('Marketplace', (accounts) => {
    let marketplace;

    beforeEach(async () => {
        marketplace = await Marketplace.new();
    });

    it('stores the seller when a product is listed', async () => {
        await marketplace.addProduct('iPhone 11', 'image-link', web3.utils.toWei('1', 'ether'), {
            from: accounts[0],
        });

        const product = await marketplace.products(1);
        assert.equal(product.seller, accounts[0], 'seller should be the listing account');
    });

    it('pays the seller when a product is purchased', async () => {
        await marketplace.addProduct('iPhone 11', 'image-link', web3.utils.toWei('1', 'ether'), {
            from: accounts[0],
        });

        const sellerBalanceBefore = BigInt(await web3.eth.getBalance(accounts[0]));
        await marketplace.purchaseProduct(1, {
            from: accounts[1],
            value: web3.utils.toWei('1', 'ether'),
        });
        const sellerBalanceAfter = BigInt(await web3.eth.getBalance(accounts[0]));

        assert.equal(
            sellerBalanceAfter.toString(),
            (sellerBalanceBefore + BigInt(web3.utils.toWei('1', 'ether'))).toString(),
            'seller balance should increase by the full purchase price'
        );
    });

    it('rejects shipping updates from non-sellers', async () => {
        await marketplace.addProduct('iPhone 11', 'image-link', web3.utils.toWei('1', 'ether'), {
            from: accounts[0],
        });
        await marketplace.purchaseProduct(1, {
            from: accounts[1],
            value: web3.utils.toWei('1', 'ether'),
        });

        try {
            await marketplace.updateOrderStatus(1, 1, { from: accounts[2] });
            assert.fail('expected revert for non-seller');
        } catch (error) {
            assert.include(error.message, 'Only seller can update order status');
        }
    });

    it('allows the seller to update shipping status', async () => {
        await marketplace.addProduct('iPhone 11', 'image-link', web3.utils.toWei('1', 'ether'), {
            from: accounts[0],
        });
        await marketplace.purchaseProduct(1, {
            from: accounts[1],
            value: web3.utils.toWei('1', 'ether'),
        });

        await marketplace.updateOrderStatus(1, 2, { from: accounts[0] });

        const product = await marketplace.products(1);
        assert.equal(product.orderStatus.toNumber(), 2, 'order status should be updated');
    });
});
