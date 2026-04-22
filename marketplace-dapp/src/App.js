import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import JSZip from 'jszip';
import { getWeb3, requestAccounts } from './web3';
import { getMarketplaceContract } from './marketplaceContract';
import { IPFS_GATEWAY_URL, uploadToIPFS as uploadPackageToIPFS } from './ipfsUpload';

const activeIpfsGateway = IPFS_GATEWAY_URL;

function App() {
    return (
        <Router>
            <Navigation />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/add-product" element={<AddProduct />} />
                <Route path="/manage-shipping" element={<ManageShipping />} />
                <Route path="/purchased-orders" element={<PurchasedOrders />} />
            </Routes>
        </Router>
    );
}

export function Navigation() {
    return (
        <nav style={{ padding: '10px', backgroundColor: '#f5f5f5' }}>
            <Link to="/" style={{ marginRight: '20px' }}>
                Home
            </Link>
            <Link to="/add-product" style={{ marginRight: '20px' }}>
                Add Product
            </Link>
            <Link to="/manage-shipping" style={{ marginRight: '20px' }}>
                Manage Shipping
            </Link>
            <Link to="/purchased-orders" style={{ marginRight: '20px' }}>
                Purchased Orders
            </Link>
        </nav>
    );
}

async function loadMarketplaceClient() {
    const [accounts, marketplace] = await Promise.all([requestAccounts(), getMarketplaceContract()]);

    if (!accounts.length) {
        throw new Error('No wallet account is connected.');
    }

    return {
        account: accounts[0],
        marketplace,
    };
}

function formatPrice(price) {
    return getWeb3().utils.fromWei(price, 'ether');
}

function getOrderStatusText(status) {
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
}

async function fetchProductDetails(product) {
    try {
        const response = await fetch(`${activeIpfsGateway}${product.image}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.type !== 'application/zip') {
            return {
                ...product,
                description: 'No description available for this file type.',
                imageUrl: URL.createObjectURL(blob),
            };
        }

        const zip = await JSZip.loadAsync(blob);
        const descriptionFile = zip.file('description.txt');
        const imageFileName = Object.keys(zip.files).find((name) => name !== 'description.txt');
        const imageFile = imageFileName ? zip.file(imageFileName) : null;

        return {
            ...product,
            description: descriptionFile ? await descriptionFile.async('string') : 'No description available.',
            imageUrl: imageFile ? URL.createObjectURL(await imageFile.async('blob')) : null,
        };
    } catch (error) {
        console.error(`Error fetching product ${product.id} details:`, error);
        return {
            ...product,
            description: 'Failed to load description.',
            imageUrl: null,
        };
    }
}

function Home() {
    const [account, setAccount] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadBlockchainData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
                const productCount = Number(await marketplace.methods.productCount().call());
                const loadedProducts = [];

                for (let i = 1; i <= productCount; i += 1) {
                    const product = await marketplace.methods.products(i).call();
                    if (!product.isSold) {
                        loadedProducts.push(await fetchProductDetails(product));
                    }
                }

                if (!cancelled) {
                    setAccount(connectedAccount);
                    setProducts(loadedProducts);
                }
            } catch (loadError) {
                console.error('Error loading blockchain data:', loadError);
                if (!cancelled) {
                    setError(loadError.message || 'Failed to load products. Please try again later.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadBlockchainData();
        return () => {
            cancelled = true;
        };
    }, []);

    const handlePurchaseProduct = async (id, price) => {
        setLoading(true);

        try {
            const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
            await marketplace.methods.purchaseProduct(id).send({
                from: account || connectedAccount,
                value: price,
            });

            setProducts((currentProducts) =>
                currentProducts.filter((product) => String(product.id) !== String(id))
            );
            alert('Product purchased successfully!');
        } catch (purchaseError) {
            console.error('Error purchasing product:', purchaseError);
            alert(purchaseError.message || 'Failed to purchase product. Please try again.');
        } finally {
            setLoading(false);
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
                            <strong>Price:</strong> {formatPrice(product.price)} COIN
                        </p>
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
        let cancelled = false;

        const loadAccount = async () => {
            try {
                const { account: connectedAccount } = await loadMarketplaceClient();
                if (!cancelled) {
                    setAccount(connectedAccount);
                }
            } catch (loadError) {
                console.error('Error loading account:', loadError);
            }
        };

        loadAccount();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile || null);
    };

    const handleAddProduct = async () => {
        if (!name || !file || !price || !description) {
            alert('Please fill in all fields before adding a product.');
            return;
        }

        setLoading(true);
        try {
            const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
            const web3 = getWeb3();
            const zip = new JSZip();

            zip.file('description.txt', description);
            zip.file(file.name, file);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const cid = await uploadPackageToIPFS(zipBlob);

            await marketplace.methods
                .addProduct(name, cid, web3.utils.toWei(price, 'ether'))
                .send({ from: account || connectedAccount });

            setName('');
            setDescription('');
            setFile(null);
            setPrice('');
            alert('Product added successfully!');
        } catch (addError) {
            console.error('Error adding product:', addError);
            alert(addError.message || 'Failed to add product. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Add Product</h1>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Product Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    style={{ width: '300px', padding: '8px', marginRight: '10px' }}
                />
                <input
                    type="text"
                    placeholder="Price"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    style={{ width: '200px', padding: '8px' }}
                />
                <br />
                <textarea
                    placeholder="Product Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
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
        let cancelled = false;

        const loadBlockchainData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
                const productCount = Number(await marketplace.methods.productCount().call());
                const loadedProducts = [];

                for (let i = 1; i <= productCount; i += 1) {
                    const product = await marketplace.methods.products(i).call();
                    if (
                        product.isSold &&
                        product.seller?.toLowerCase() === connectedAccount.toLowerCase()
                    ) {
                        loadedProducts.push(product);
                    }
                }

                if (!cancelled) {
                    setAccount(connectedAccount);
                    setProducts(loadedProducts);
                }
            } catch (loadError) {
                console.error('Error loading blockchain data:', loadError);
                if (!cancelled) {
                    setError(loadError.message || 'Failed to load products. Please try again later.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadBlockchainData();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleUpdateStatus = async (id, newStatus) => {
        setLoading(true);
        try {
            const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
            await marketplace.methods
                .updateOrderStatus(id, newStatus)
                .send({ from: account || connectedAccount });

            alert('Order status updated successfully!');
            setProducts((currentProducts) =>
                currentProducts.map((product) =>
                    String(product.id) === String(id)
                        ? { ...product, orderStatus: newStatus }
                        : product
                )
            );
        } catch (updateError) {
            console.error('Error updating order status:', updateError);
            alert(updateError.message || 'Failed to update order status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Manage Shipping Status</h1>
            <p>
                <strong>Connected account:</strong> {account}
            </p>
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
                            <strong>Buyer:</strong> {product.buyer}
                        </p>
                        <p>
                            <strong>Price:</strong> {formatPrice(product.price)} COIN
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
        let cancelled = false;

        const loadPurchasedProducts = async () => {
            setLoading(true);
            setError(null);

            try {
                const { account: connectedAccount, marketplace } = await loadMarketplaceClient();
                const productCount = Number(await marketplace.methods.productCount().call());
                const loadedProducts = [];

                for (let i = 1; i <= productCount; i += 1) {
                    const product = await marketplace.methods.products(i).call();
                    if (product.buyer?.toLowerCase() === connectedAccount.toLowerCase()) {
                        loadedProducts.push(await fetchProductDetails(product));
                    }
                }

                if (!cancelled) {
                    setAccount(connectedAccount);
                    setPurchasedProducts(loadedProducts);
                }
            } catch (loadError) {
                console.error('Error loading purchased products:', loadError);
                if (!cancelled) {
                    setError(
                        loadError.message || 'Failed to load purchased products. Please try again later.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadPurchasedProducts();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Purchased Orders</h1>
            <p>
                <strong>Connected account:</strong> {account}
            </p>
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
                            <strong>Price:</strong> {formatPrice(product.price)} COIN
                        </p>
                        <p>
                            <strong>Order Status:</strong> {getOrderStatusText(product.orderStatus)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
