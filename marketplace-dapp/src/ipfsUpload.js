const DEFAULT_IPFS_API_URL = 'http://127.0.0.1:5001/api/v0/add?pin=true';
export const IPFS_GATEWAY_URL =
    (process.env.REACT_APP_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs/').trim();

function parseIpfsAddResponse(body) {
    const lines = body
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        throw new Error('Local IPFS upload succeeded but no CID was returned.');
    }

    const lastLine = JSON.parse(lines[lines.length - 1]);
    if (typeof lastLine.Hash === 'string' && lastLine.Hash.length > 0) {
        return lastLine.Hash;
    }

    throw new Error('Local IPFS upload succeeded but no CID was returned.');
}

function getIpfsErrorMessage(result, fallbackMessage) {
    if (!result) {
        return fallbackMessage;
    }

    if (typeof result === 'string' && result.trim()) {
        return result.trim();
    }

    if (typeof result === 'object') {
        if (typeof result.Message === 'string' && result.Message.trim()) {
            return result.Message.trim();
        }

        if (typeof result.message === 'string' && result.message.trim()) {
            return result.message.trim();
        }
    }

    return fallbackMessage;
}

export async function uploadToIPFS(file, fetchImpl = fetch, env = process.env) {
    const apiUrl = (env.REACT_APP_IPFS_API_URL || DEFAULT_IPFS_API_URL).trim();
    const formData = new FormData();
    formData.append('file', file, file.name || 'package.zip');

    let response;
    try {
        response = await fetchImpl(apiUrl, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        throw new Error(
            `Local IPFS node is unavailable at ${apiUrl}. Start IPFS Desktop or another local IPFS node and try again.`
        );
    }

    const body = await response.text();
    if (!response.ok) {
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch {
            parsed = body;
        }

        throw new Error(
            getIpfsErrorMessage(parsed, `Local IPFS upload failed with status ${response.status}.`)
        );
    }

    return parseIpfsAddResponse(body);
}
