
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'; // 注意这里的改动
import web3 from './web3';
import MarketplaceABI from './Marketplace.json';
import JSZip from 'jszip';

const contractAddress = '0x989A33f7D7030977ED2Bc434C23BcCdcabB2127a'; // 替换为你部署的合约地址
const Marketplace = new web3.eth.Contract(MarketplaceABI.abi, contractAddress);
const ipfsGateway = 'https://along-known-struck.quicknode-ipfs.com/ipfs/'; // 替换为你的IPFS网关

function App() {
    return (
        <Router>
            <Navigation />
            <Routes> {/* 将 Switch 替换为 Routes */}
                <Route path="/" element={<Home />} /> {/* 使用 element 属性 */}
                <Route path="/add-product" element={<AddProduct />} /> {/* 新增的添加商品页面 */}
                <Route path="/manage-shipping" element={<ManageShipping />} />
                <Route path="/purchased-orders" element={<PurchasedOrders />} /> {/* 新增的订单页面 */}
            </Routes>
        </Router>
    );
}

function Navigation() {
    return (
        <nav style={{ padding: '10px', backgroundColor: '#f5f5f5' }}>
            <Link to="/" style={{ marginRight: '20px' }}>Home</Link>
            <Link to="/add-product" style={{ marginRight: '20px' }}>Add Product</Link> {/* 添加商品页面链接 */}
            <Link to="/manage-shipping" style={{ marginRight: '20px' }}>Manage Shipping</Link>
            <Link to="/purchased-orders" style={{ marginRight: '20px' }}>Purchased Orders</Link> {/* 订单页面链接 */}
        </nav>
    );
}

function Home() {
    const [account, setAccount] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadBlockchainData = async () => {
            setLoading(true);
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                const productCount = await Marketplace.methods.productCount().call();
                const loadedProducts = [];

                // for (let i = 1; i <= productCount; i++) {
                //     const product = await Marketplace.methods.products(i).call();
                //     const detailedProduct = await fetchProductDetails(product);
                //     loadedProducts.push(detailedProduct);
                // }
                for (let i = 1; i <= productCount; i++) {
                    const product = await Marketplace.methods.products(i).call();
                    if (!product.isSold) { // 只显示未售出的商品
                        const detailedProduct = await fetchProductDetails(product);
                        loadedProducts.push(detailedProduct);
                    }
                }

                setProducts(loadedProducts);
            } catch (err) {
                console.error('Error loading blockchain data:', err);
                setError('Failed to load products. Please try again later.');
            }
            setLoading(false);
        };

        loadBlockchainData();
    }, []);

    const fetchProductDetails = async (product) => {
        try {
            const response = await fetch(`${ipfsGateway}${product.image}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
            }
            const blob = await response.blob();

            if (blob.type === "application/zip") {
                const zip = await JSZip.loadAsync(blob);
                const descriptionFile = zip.file('description.txt');
                const description = await descriptionFile.async('string');

                const imageFileName = Object.keys(zip.files).find(
                    (name) => name !== 'description.txt'
                );
                const imageFile = zip.file(imageFileName);
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);

                return {
                    ...product,
                    description,
                    imageUrl,
                };
            } else {
                const imageUrl = URL.createObjectURL(blob);
                return {
                    ...product,
                    description: 'No description available for this file type.',
                    imageUrl,
                };
            }
        } catch (err) {
            console.error(`Error fetching product ${product.id} details:`, err);
            return {
                ...product,
                description: 'Failed to load description.',
                imageUrl: null,
            };
        }
    };

    const handlePurchaseProduct = async (id, price) => {
        setLoading(true);
        try {
            await Marketplace.methods.purchaseProduct(id).send({
                from: account,
                value: price,
            });

            setProducts(
                products.map((product) =>
                    product.id === id ? { ...product, isSold: true } : product
                )
            );
            alert('Product purchased successfully!');
        } catch (err) {
            console.error('Error purchasing product:', err);
            alert('Failed to purchase product. Please try again.');
        }
        setLoading(false);
    };

    const getOrderStatusText = (status) => {
        switch (parseInt(status, 10)) {
            case 0:
                return 'Not Shipped';
            case 1:
                return 'Shipped';
            case 2:
                return 'Delivered';
            default:
                return 'Unknown';
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Marketplace DApp</h1>
            <p>
                <strong>Connected account:</strong> {account}
            </p>

            <h2>Purchasable Item</h2>
            {loading && <p>Loading products...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            padding: '15px',
                            width: '300px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3>{product.name}</h3>
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    marginBottom: '10px',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    backgroundColor: '#eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '10px',
                                }}
                            >
                                <span>No Image Available</span>
                            </div>
                        )}
                        <p>
                            <strong>Description:</strong>{' '}
                            {product.description || 'No description available.'}
                        </p>
                        <p>
                            <strong>Price:</strong>{' '}
                            {web3.utils.fromWei(product.price, 'ether')} COIN
                        </p>
                        {!product.isSold && (
                            <button
                                onClick={() => handlePurchaseProduct(product.id, product.price)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    width: '100%',
                                    marginTop: '10px',
                                }}
                                disabled={loading}
                            >
                                Purchase
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AddProduct() {
    const [account, setAccount] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadAccount = async () => {
            const accounts = await web3.eth.getAccounts();
            setAccount(accounts[0]);
        };

        loadAccount();
    }, []);

    const uploadToIPFS = async (file) => {
        const apiKey = 'QN_4ae36340d8e94726846e89d67e823877'; // 替换为你的 QuickNode API Key
        const url = 'https://api.quicknode.com/ipfs/rest/v1/s3/put-object';

        const myHeaders = new Headers();
        myHeaders.append("x-api-key", apiKey);

        const formData = new FormData();
        formData.append("Body", file);
        formData.append("Key", file.name); // 使用文件名作为 Key
        formData.append("ContentType", file.type); // 获取文件的 MIME 类型

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: formData,
            redirect: 'follow'
        };

        try {
            const response = await fetch(url, requestOptions);
            const result = await response.json(); // 确保解析 JSON 响应
            console.log('IPFS Upload Response:', result);

            if (result && result.pin && result.pin.cid) {
                return result.pin.cid;
            } else {
                console.error('Invalid response from IPFS upload:', result);
                return null;
            }
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            return null;
        }
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
    };

    const handleAddProduct = async () => {
        if (!name || !file || !price || !description) {
            alert('Please fill in all fields before adding a product.');
            return;
        }

        setLoading(true);
        try {
            const zip = new JSZip();
            zip.file('description.txt', description);
            zip.file(file.name, file);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            console.log('Generated ZIP Blob:', zipBlob);

            const cid = await uploadToIPFS(zipBlob);
            if (!cid) {
                alert('Failed to upload package to IPFS. Please try again.');
                setLoading(false);
                return;
            }

            await Marketplace.methods
                .addProduct(name, cid, web3.utils.toWei(price, 'ether'))
                .send({ from: account });

            setName('');
            setDescription('');
            setFile(null);
            setPrice('');
            alert('Product added successfully!');
        } catch (err) {
            console.error('Error adding product:', err);
            alert('Failed to add product. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Add Product</h1>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '300px', padding: '8px', marginRight: '10px' }}
                />
                <input
                    type="text"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ width: '200px', padding: '8px' }}
                />
                <br />
                <textarea
                    placeholder="Product Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                        width: '515px',
                        height: '100px',
                        padding: '8px',
                        marginTop: '10px',
                    }}
                ></textarea>
                <br />
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ marginTop: '10px' }}
                />
                <br />
                <button
                    onClick={handleAddProduct}
                    style={{
                        marginTop: '10px',
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    disabled={loading}
                >
                    {loading ? 'Adding Product...' : 'Add Product'}
                </button>
            </div>
        </div>
    );
}

function ManageShipping() {
    const [account, setAccount] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadBlockchainData = async () => {
            setLoading(true);
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                const productCount = await Marketplace.methods.productCount().call();
                const loadedProducts = [];

                for (let i = 1; i <= productCount; i++) {
                    const product = await Marketplace.methods.products(i).call();

                    if (product.isSold) { // 只加载已售出的商品
                        loadedProducts.push(product);
                    }
                }

                setProducts(loadedProducts);
            } catch (err) {
                console.error('Error loading blockchain data:', err);
                setError('Failed to load products. Please try again later.');
            }
            setLoading(false);
        };

        loadBlockchainData();
    }, []);

    const handleUpdateStatus = async (id, newStatus) => {
        setLoading(true);
        try {
            await Marketplace.methods.updateOrderStatus(id, newStatus).send({ from: account });
            alert('Order status updated successfully!');

            setProducts(products.map((product) => 
                product.id === id ? { ...product, orderStatus: newStatus } : product
            ));
        } catch (err) {
            console.error('Error updating order status:', err);
            alert('Failed to update order status. Please try again.');
        }
        setLoading(false);
    };

    const getOrderStatusText = (status) => {
        switch (parseInt(status, 10)) {
            case 0:
                return 'Not Shipped';
            case 1:
                return 'Shipped';
            case 2:
                return 'Delivered';
            default:
                return 'Unknown';
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Manage Shipping Status</h1>
            {loading && <p>Loading products...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            padding: '15px',
                            width: '300px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3>{product.name}</h3>
                        <p>
                            <strong>Price:</strong> {web3.utils.fromWei(product.price, 'ether')} COIN
                        </p>
                        <p>
                            <strong>Order Status:</strong> {getOrderStatusText(product.orderStatus)}
                        </p>
                        <button
                            onClick={() => handleUpdateStatus(product.id, 1)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                width: '100%',
                            }}
                            disabled={loading}
                        >
                            Mark as Shipped
                        </button>
                        <button
                            onClick={() => handleUpdateStatus(product.id, 2)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                            disabled={loading}
                        >
                            Mark as Delivered
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PurchasedOrders() {
    const [account, setAccount] = useState('');
    const [purchasedProducts, setPurchasedProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPurchasedProducts = async () => {
            setLoading(true);
            try {
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                const productCount = await Marketplace.methods.productCount().call();
                const loadedProducts = [];

                for (let i = 1; i <= productCount; i++) {
                    const product = await Marketplace.methods.products(i).call();
                    if (product.buyer.toLowerCase() === accounts[0].toLowerCase()) {
                        const detailedProduct = await fetchProductDetails(product);
                        loadedProducts.push(detailedProduct);
                    }
                }

                setPurchasedProducts(loadedProducts);
            } catch (err) {
                console.error('Error loading purchased products:', err);
                setError('Failed to load purchased products. Please try again later.');
            }
            setLoading(false);
        };

        loadPurchasedProducts();
    }, []);

    const fetchProductDetails = async (product) => {
        try {
            const response = await fetch(`${ipfsGateway}${product.image}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
            }
            const blob = await response.blob();

            if (blob.type === "application/zip") {
                const zip = await JSZip.loadAsync(blob);
                const descriptionFile = zip.file('description.txt');
                const description = await descriptionFile.async('string');

                const imageFileName = Object.keys(zip.files).find(
                    (name) => name !== 'description.txt'
                );
                const imageFile = zip.file(imageFileName);
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);

                return {
                    ...product,
                    description,
                    imageUrl,
                };
            } else {
                const imageUrl = URL.createObjectURL(blob);
                return {
                    ...product,
                    description: 'No description available for this file type.',
                    imageUrl,
                };
            }
        } catch (err) {
            console.error(`Error fetching product ${product.id} details:`, err);
            return {
                ...product,
                description: 'Failed to load description.',
                imageUrl: null,
            };
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Purchased Orders</h1>
            {loading && <p>Loading purchased products...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                }}
            >
                {purchasedProducts.map((product) => (
                    <div
                        key={product.id}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            padding: '15px',
                            width: '300px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3>{product.name}</h3>
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    marginBottom: '10px',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    backgroundColor: '#eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '10px',
                                }}
                            >
                                <span>No Image Available</span>
                            </div>
                        )}
                        <p>
                            <strong>Description:</strong>{' '}
                            {product.description || 'No description available.'}
                        </p>
                        <p>
                            <strong>Price:</strong>{' '}
                            {web3.utils.fromWei(product.price, 'ether')} COIN
                        </p>
                        <p>
                            <strong>Order Status:</strong>{' '}
                            {getOrderStatusText(product.orderStatus)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

const getOrderStatusText = (status) => {
    switch (parseInt(status, 10)) {
        case 0:
            return 'Not Shipped';
        case 1:
            return 'Shipped';
        case 2:
            return 'Delivered';
        default:
            return 'Unknown';
    }
};

export default App;
