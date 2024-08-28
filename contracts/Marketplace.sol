// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {
    struct Product {
        uint id;
        string name;
        string image;
        uint price;
        bool isSold;
        uint orderStatus; 
        address buyer; 
    }

   
    mapping(uint => Product) public products;

 
    uint public productCount = 0;
    event ProductAdded(uint id, string name, string image, uint price);
    event ProductPurchased(uint id, address buyer);
    event OrderStatusUpdated(uint id, uint status);

    // 添加商品
    function addProduct(string memory _name, string memory _image, uint _price) public {
        productCount++;
        products[productCount] = Product(productCount, _name, _image, _price, false, 0, address(0));
        emit ProductAdded(productCount, _name, _image, _price);
    }

    // 购买商品
    function purchaseProduct(uint _id) public payable {
        Product storage product = products[_id];
        require(_id > 0 && _id <= productCount, "Invalid product ID");
        require(msg.value >= product.price, "Insufficient funds");
        require(!product.isSold, "Product already sold");

        product.isSold = true;
        product.buyer = msg.sender;

        emit ProductPurchased(_id, msg.sender);
    }

    // 修改订单状态
    function updateOrderStatus(uint _id, uint _status) public {
        require(_id > 0 && _id <= productCount, "Invalid product ID");
        require(_status >= 0 && _status <= 2, "Invalid status");

        Product storage product = products[_id];
        require(product.isSold, "Product not yet sold");

        product.orderStatus = _status;

        emit OrderStatusUpdated(_id, _status);
    }

    // 查询订单信息
    function getOrderInfo(uint _id) public view returns (uint, string memory, string memory, uint, bool, uint, address) {
        require(_id > 0 && _id <= productCount, "Invalid product ID");

        Product memory product = products[_id];
        return (product.id, product.name, product.image, product.price, product.isSold, product.orderStatus, product.buyer);
    }
}
