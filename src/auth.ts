import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import axios from 'axios';
import { AUTH_TYPE, AUTH_TYPE_BASIC_FILE_PATH, AUTH_TYPE_BASIC_CLIENT_ID, AUTH_TYPE_BASIC_API_URL, AUTH_TYPE_OAUTH_URL } from './config';

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
    tokenInfo?: TokenInfo;
}

export interface TokenInfo {
    token: string;
    memberAccess: boolean;
}

class BasicAuthProvider {
    private tokenMap: Map<string, boolean> = new Map();
    private clientId?: string;
    private apiUrl?: string;

    constructor(filePath?: string, clientId?: string, apiUrl?: string) {
        this.clientId = clientId;
        this.apiUrl = apiUrl;

        if (filePath) {
            this.loadTokensFromFile(filePath);
        }
    }

    private loadTokensFromFile(filePath: string) {
        try {
            const csvData = readFileSync(filePath, 'utf-8');
            const records = parse(csvData, {
                columns: ['token', 'member_access'],
                skip_empty_lines: true,
                trim: true
            });

            for (const record of records) {
                const typedRecord = record as { token?: string; member_access?: string };
                if (typedRecord.token) {
                    const memberAccess = typedRecord.member_access?.toLowerCase() === 'true';
                    this.tokenMap.set(typedRecord.token, memberAccess);
                }
            }

            console.log(`Loaded ${this.tokenMap.size} tokens from ${filePath}`);
        } catch (error) {
            console.error(`Failed to load tokens from ${filePath}:`, error);
            throw error;
        }
    }

    async validateToken(token: string): Promise<TokenInfo | null> {
        // Method 1: Check against CSV file if available
        if (this.tokenMap.size > 0) {
            const memberAccess = this.tokenMap.get(token);
            if (memberAccess !== undefined) {
                return { token, memberAccess };
            }
            return null;
        }

        // Method 2: Validate via 3rd party API if configured
        if (this.clientId && this.apiUrl) {
            return await this.validateTokenViaAPI(token);
        }

        return null;
    }

    private async validateTokenViaAPI(token: string): Promise<TokenInfo | null> {
        try {
            const response = await axios.post(`${this.apiUrl}/validate`, {
                client_id: this.clientId,
                token: token
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            const responseData = response.data as { valid?: boolean; member_access?: boolean };
            if (response.status === 200 && responseData.valid === true) {
                return {
                    token,
                    memberAccess: responseData.member_access || false
                };
            }
            return null;
        } catch (error) {
            console.error('Token validation via API failed:', error);
            return null;
        }
    }

    validateCredentials(clientId: string, clientSecret: string): boolean {
        // Not used in new token-based approach
        return false;
    }

    generateToken(clientId: string): TokenResponse {
        // Not used in new token-based approach
        throw new Error('Token generation not supported in new BASIC auth mode');
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
                this.basicProvider = new BasicAuthProvider(
                    AUTH_TYPE_BASIC_FILE_PATH,
                    AUTH_TYPE_BASIC_CLIENT_ID,
                    AUTH_TYPE_BASIC_API_URL
                );
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

    async validateToken(token: string): Promise<TokenInfo | null> {
        switch (AUTH_TYPE) {
            case 'NONE':
                return { token, memberAccess: true }; // No auth means full access
            case 'BASIC':
                return await this.basicProvider?.validateToken(token) || null;
            case 'OAUTH':
                try {
                    await this.oauthProvider?.validateToken(token);
                    return { token, memberAccess: true }; // OAuth tokens get full access
                } catch {
                    return null;
                }
            default:
                return null;
        }
    }
}

export const authManager = new AuthManager();

// Simple session store for token info
export const sessionStore = new Map<string, TokenInfo>();

export function setSessionTokenInfo(sessionId: string, tokenInfo: TokenInfo) {
    sessionStore.set(sessionId, tokenInfo);
}

export function getSessionTokenInfo(sessionId: string): TokenInfo | null {
    return sessionStore.get(sessionId) || null;
}

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

export function extractTokenFromUrl(req: Request): string | null {
    const token = req.query.token as string;
    return token || null;
}

export function authMiddleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Skip authentication for health endpoint
        if (req.path === '/health') {
            return next();
        }

        if (AUTH_TYPE === 'NONE') {
            return next();
        }

        // Check for bearer token (for authenticated MCP requests)
        const bearerToken = extractBearerToken(req);
        if (bearerToken) {
            const tokenInfo = await authManager.validateToken(bearerToken);
            if (tokenInfo) {
                req.tokenInfo = tokenInfo;
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

        // Check for token in URL query parameter (for BASIC auth)
        if (AUTH_TYPE === 'BASIC') {
            const urlToken = extractTokenFromUrl(req);
            if (urlToken) {
                const tokenInfo = await authManager.validateToken(urlToken);
                if (tokenInfo) {
                    req.tokenInfo = tokenInfo;
                    return next();
                } else {
                    return res.status(401).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32000,
                            message: 'Unauthorized: Invalid token'
                        },
                        id: null
                    });
                }
            }
        }

        // No valid authentication provided
        const authMethod = AUTH_TYPE === 'BASIC' ? 'Bearer token or ?token= query parameter' : 'Bearer token';
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: `Unauthorized: ${authMethod} required`
            },
            id: null
        });
    };
}