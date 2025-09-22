import { Request, Response, Router } from 'express';
import { authManager, extractCredentials } from './auth';
import { AUTH_TYPE } from './config';

export const oauthRouter = Router();

// OAuth token endpoint - exchanges client credentials for access token
oauthRouter.post('/oauth/token', async (req: Request, res: Response) => {
    if (AUTH_TYPE === 'NONE') {
        return res.status(400).json({
            error: 'authentication_disabled',
            error_description: 'Authentication is disabled for this server'
        });
    }

    const { grant_type, client_id, client_secret } = req.body;

    // Check for client_credentials grant type
    if (grant_type !== 'client_credentials') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Only client_credentials grant type is supported'
        });
    }

    // Check for required parameters
    if (!client_id || !client_secret) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'client_id and client_secret are required'
        });
    }

    try {
        const tokenResponse = await authManager.exchangeCredentialsForToken(client_id, client_secret);

        res.json(tokenResponse);
    } catch (error) {
        console.error('Token exchange error:', error);

        // Check if it's an authentication error
        if (error instanceof Error && error.message === 'Invalid credentials') {
            return res.status(401).json({
                error: 'invalid_client',
                error_description: 'Invalid client credentials'
            });
        }

        // Generic server error
        res.status(500).json({
            error: 'server_error',
            error_description: 'Internal server error during token exchange'
        });
    }
});

// OAuth discovery endpoint - provides server metadata
oauthRouter.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
        issuer: baseUrl,
        token_endpoint: `${baseUrl}/oauth/token`,
        grant_types_supported: ['client_credentials'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
        response_types_supported: [],
        subject_types_supported: [],
        id_token_signing_alg_values_supported: []
    });
});

// Health check for OAuth endpoints
oauthRouter.get('/oauth/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        auth_type: AUTH_TYPE,
        timestamp: new Date().toISOString()
    });
});