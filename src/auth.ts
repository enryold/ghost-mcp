import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import axios from 'axios';
import { AUTH_TYPE, AUTH_TYPE_BASIC_FILE_PATH, AUTH_TYPE_OAUTH_URL } from './config';

export interface AuthCredentials {
    clientId: string;
    clientSecret: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

export interface AuthenticatedRequest extends Request {
    auth?: AuthCredentials;
}

class BasicAuthProvider {
    private credentials: Map<string, string> = new Map();

    constructor(filePath: string) {
        this.loadCredentials(filePath);
    }

    private loadCredentials(filePath: string) {
        try {
            const csvData = readFileSync(filePath, 'utf-8');
            const records = parse(csvData, {
                columns: ['access_key', 'secret_key'],
                skip_empty_lines: true,
                trim: true
            });

            for (const record of records) {
                const typedRecord = record as { access_key?: string; secret_key?: string };
                if (typedRecord.access_key && typedRecord.secret_key) {
                    this.credentials.set(typedRecord.access_key, typedRecord.secret_key);
                }
            }

            console.log(`Loaded ${this.credentials.size} credential pairs from ${filePath}`);
        } catch (error) {
            console.error(`Failed to load credentials from ${filePath}:`, error);
            throw error;
        }
    }

    validateCredentials(clientId: string, clientSecret: string): boolean {
        const storedSecret = this.credentials.get(clientId);
        return storedSecret === clientSecret;
    }

    generateToken(clientId: string): TokenResponse {
        // Generate a simple hardcoded token for basic auth
        const token = Buffer.from(`${clientId}:${Date.now()}`).toString('base64');
        return {
            access_token: token,
            token_type: 'Bearer',
            expires_in: 3600 // 1 hour
        };
    }

    validateToken(token: string): boolean {
        try {
            // For basic auth, we just check if the token is properly formatted
            const decoded = Buffer.from(token, 'base64').toString();
            return decoded.includes(':');
        } catch {
            return false;
        }
    }
}

class OAuthProvider {
    private jwksClientInstance: jwksClient.JwksClient;
    private oauthUrl: string;

    constructor(oauthUrl: string) {
        this.oauthUrl = oauthUrl;
        this.jwksClientInstance = jwksClient({
            jwksUri: `${oauthUrl}/.well-known/jwks.json`,
            requestHeaders: {},
            timeout: 30000,
        });
    }

    async validateToken(token: string): Promise<any> {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header.kid) {
                throw new Error('Invalid token structure');
            }

            const key = await this.jwksClientInstance.getSigningKey(decoded.header.kid);
            const signingKey = key.getPublicKey();

            const payload = jwt.verify(token, signingKey, {
                algorithms: ['RS256']
            });

            return payload;
        } catch (error) {
            console.error('Token validation failed:', error);
            throw error;
        }
    }

    async exchangeCredentialsForToken(clientId: string, clientSecret: string): Promise<TokenResponse> {
        try {
            const response = await axios.post(`${this.oauthUrl}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseData = response.data as { access_token?: string; token_type?: string; expires_in?: number };

            if (response.status !== 200 || !responseData.access_token) {
                throw new Error('Failed to obtain access token');
            }

            return {
                access_token: responseData.access_token,
                token_type: responseData.token_type || 'Bearer',
                expires_in: responseData.expires_in
            };
        } catch (error) {
            console.error('OAuth token exchange failed:', error);
            throw error;
        }
    }
}

export class AuthManager {
    private basicProvider?: BasicAuthProvider;
    private oauthProvider?: OAuthProvider;

    constructor() {
        this.initialize();
    }

    private initialize() {
        switch (AUTH_TYPE) {
            case 'BASIC':
                if (AUTH_TYPE_BASIC_FILE_PATH) {
                    this.basicProvider = new BasicAuthProvider(AUTH_TYPE_BASIC_FILE_PATH);
                }
                break;
            case 'OAUTH':
                if (AUTH_TYPE_OAUTH_URL) {
                    this.oauthProvider = new OAuthProvider(AUTH_TYPE_OAUTH_URL);
                }
                break;
            case 'NONE':
            default:
                console.log('No authentication required');
                break;
        }
    }

    async exchangeCredentialsForToken(clientId: string, clientSecret: string): Promise<TokenResponse> {
        switch (AUTH_TYPE) {
            case 'NONE':
                throw new Error('Authentication not required');
            case 'BASIC':
                if (!this.basicProvider?.validateCredentials(clientId, clientSecret)) {
                    throw new Error('Invalid credentials');
                }
                return this.basicProvider.generateToken(clientId);
            case 'OAUTH':
                if (!this.oauthProvider) {
                    throw new Error('OAuth provider not initialized');
                }
                return await this.oauthProvider.exchangeCredentialsForToken(clientId, clientSecret);
            default:
                throw new Error('Unknown authentication type');
        }
    }

    async validateToken(token: string): Promise<boolean> {
        switch (AUTH_TYPE) {
            case 'NONE':
                return true;
            case 'BASIC':
                return this.basicProvider?.validateToken(token) || false;
            case 'OAUTH':
                try {
                    await this.oauthProvider?.validateToken(token);
                    return true;
                } catch {
                    return false;
                }
            default:
                return false;
        }
    }
}

export const authManager = new AuthManager();

export function extractCredentials(req: Request): AuthCredentials | null {
    const clientId = req.headers['x-client-id'] as string;
    const clientSecret = req.headers['x-client-secret'] as string;

    if (clientId && clientSecret) {
        return { clientId, clientSecret };
    }

    return null;
}

export function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

export function authMiddleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (AUTH_TYPE === 'NONE') {
            return next();
        }

        // Check for bearer token (for authenticated MCP requests)
        const bearerToken = extractBearerToken(req);
        if (bearerToken) {
            const isValidToken = await authManager.validateToken(bearerToken);
            if (isValidToken) {
                return next();
            } else {
                return res.status(401).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Unauthorized: Invalid or expired token'
                    },
                    id: null
                });
            }
        }

        // No bearer token provided - authentication required
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Unauthorized: Bearer token required'
            },
            id: null
        });
    };
}