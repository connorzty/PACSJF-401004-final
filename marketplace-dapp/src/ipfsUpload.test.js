import { uploadToIPFS } from './ipfsUpload';

describe('uploadToIPFS', () => {
    test('uploads to the local IPFS API and returns the CID', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            headers: {
                get: () => 'application/json',
            },
            text: async () => '{"Name":"package.zip","Hash":"bafy-test-cid","Size":"123"}\n',
        });

        const cid = await uploadToIPFS(new Blob(['hello'], { type: 'application/zip' }), fetchMock);

        expect(cid).toBe('bafy-test-cid');
        expect(fetchMock).toHaveBeenCalledWith(
            'http://127.0.0.1:5001/api/v0/add?pin=true',
            expect.objectContaining({
                method: 'POST',
            })
        );
    });

    test('throws a clear error when the local IPFS node is unavailable', async () => {
        await expect(
            uploadToIPFS(
                new Blob(['hello'], { type: 'application/zip' }),
                jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
            )
        ).rejects.toThrow(
            'Local IPFS node is unavailable at http://127.0.0.1:5001/api/v0/add?pin=true. Start IPFS Desktop or another local IPFS node and try again.'
        );
    });
});
