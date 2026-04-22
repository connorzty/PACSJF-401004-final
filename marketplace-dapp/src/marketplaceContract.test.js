import { getMarketplaceContract } from './marketplaceContract';

describe('getMarketplaceContract', () => {
    const mockArtifact = {
        abi: ['mock-abi'],
        networks: {
            1337: {
                address: '0x1234567890123456789012345678901234567890',
            },
        },
    };

    test('creates a contract from the deployed address for the active network', async () => {
        const contractInstance = { methods: {} };
        const mockWeb3 = {
            eth: {
                net: {
                    getId: jest.fn().mockResolvedValue(1337),
                },
                Contract: jest.fn().mockReturnValue(contractInstance),
            },
        };

        const contract = await getMarketplaceContract(mockWeb3, mockArtifact);

        expect(mockWeb3.eth.Contract).toHaveBeenCalledWith(
            ['mock-abi'],
            '0x1234567890123456789012345678901234567890'
        );
        expect(contract).toBe(contractInstance);
    });

    test('throws a clear error when the contract is not deployed on the active network', async () => {
        const mockWeb3 = {
            eth: {
                net: {
                    getId: jest.fn().mockResolvedValue(5777),
                },
                Contract: jest.fn(),
            },
        };

        await expect(getMarketplaceContract(mockWeb3, mockArtifact)).rejects.toThrow(
            'Marketplace contract is not deployed on network 5777. Run truffle migrate and refresh the app.'
        );
    });
});
