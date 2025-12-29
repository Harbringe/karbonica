// API Client for Karbonica Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    meta?: {
        timestamp: string;
        requestId: string;
    };
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

class ApiClient {
    private accessToken: string | null = null;

    setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const { method = 'GET', body, headers = {} } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (this.accessToken) {
            requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    status: 'error',
                    error: {
                        code: data.error?.code || 'UNKNOWN_ERROR',
                        message: data.error?.message || 'An unknown error occurred',
                    },
                };
            }

            return data;
        } catch (error) {
            return {
                status: 'error',
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error occurred',
                },
            };
        }
    }

    // Auth endpoints
    async login(email: string, password: string) {
        return this.request<{
            user: {
                id: string;
                email: string;
                name: string;
                company: string | null;
                role: string;
                emailVerified: boolean;
                lastLoginAt: string | null;
            };
            tokens: {
                accessToken: string;
                refreshToken: string;
                accessTokenExpiry: string;
                refreshTokenExpiry: string;
            };
        }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
    }

    async register(data: { email: string; password: string; name: string; company?: string; role: string }) {
        return this.request<{
            user: {
                id: string;
                email: string;
                name: string;
                role: string;
            };
            message: string;
        }>('/auth/register', {
            method: 'POST',
            body: data,
        });
    }

    async refreshToken(refreshToken: string) {
        return this.request<{
            accessToken: string;
            accessTokenExpiry: string;
        }>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken },
        });
    }

    async getProfile() {
        return this.request<{
            user: {
                id: string;
                email: string;
                name: string;
                company: string | null;
                role: string;
                emailVerified: boolean;
                createdAt: string;
            };
        }>('/auth/me');
    }

    // Projects endpoints
    async getProjects(params?: { status?: string; type?: string; limit?: number; cursor?: string }) {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.type) searchParams.set('type', params.type);
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.cursor) searchParams.set('cursor', params.cursor);

        const query = searchParams.toString();
        return this.request<{
            projects: Array<{
                id: string;
                developerId: string;
                title: string;
                type: string;
                description: string;
                location: string;
                country: string;
                emissionsTarget: number;
                status: string;
                createdAt: string;
            }>;
            pagination: {
                total: number;
                limit: number;
                cursor: string | null;
                hasMore: boolean;
            };
        }>(`/projects${query ? `?${query}` : ''}`);
    }

    async getProject(id: string) {
        return this.request<{
            project: {
                id: string;
                developerId: string;
                title: string;
                type: string;
                description: string;
                location: string;
                country: string;
                coordinates: { latitude: number; longitude: number } | null;
                emissionsTarget: number;
                startDate: string;
                estimatedCompletionDate?: string | null;
                status: string;
                imageUrl?: string | null;
                contactInfo?: {
                    projectManagerName: string;
                    projectManagerEmail: string;
                    organizationName: string;
                    organizationEmail: string;
                } | null;
                documents?: Array<{
                    id: string;
                    name: string;
                    url: string;
                    type: string;
                    size: number;
                }>;
                createdAt: string;
                updatedAt: string;
            };
        }>(`/projects/${id}`);
    }

    async createProject(data: {
        title: string;
        type: string;
        description: string;
        location: string;
        country: string;
        coordinates?: { latitude: number; longitude: number };
        emissionsTarget: number;
        startDate: string;
        estimatedCompletionDate?: string;
        imageUrl?: string;
        contactInfo?: {
            projectManagerName: string;
            projectManagerEmail: string;
            organizationName: string;
            organizationEmail: string;
        };
    }) {
        return this.request<{
            project: {
                id: string;
                title: string;
                status: string;
            };
        }>('/projects', {
            method: 'POST',
            body: data,
        });
    }

    async deleteProject(id: string) {
        return this.request<{
            message: string;
        }>(`/projects/${id}`, {
            method: 'DELETE',
        });
    }

    // Credits endpoints
    async getCredits(params?: { status?: string; vintage?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.vintage) searchParams.set('vintage', params.vintage.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());

        const query = searchParams.toString();
        return this.request<{
            credits: Array<{
                id: string;
                creditId: string;
                projectId: string;
                ownerId: string;
                quantity: number;
                vintage: number;
                status: string;
                issuedAt: string;
            }>;
            pagination: {
                total: number;
                limit: number;
                hasMore: boolean;
            };
        }>(`/credits${query ? `?${query}` : ''}`);
    }

    async transferCredit(creditId: string, recipientId: string, quantity: number) {
        return this.request<{
            credit: object;
            transaction: object;
        }>(`/credits/${creditId}/transfer`, {
            method: 'POST',
            body: { recipientId, quantity },
        });
    }

    async retireCredit(creditId: string, reason?: string) {
        return this.request<{
            credit: object;
            transaction: object;
        }>(`/credits/${creditId}/retire`, {
            method: 'POST',
            body: { reason },
        });
    }

    // Marketplace endpoints
    async getListings(params?: { projectType?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params?.projectType) searchParams.set('projectType', params.projectType);
        if (params?.minPrice) searchParams.set('minPrice', params.minPrice.toString());
        if (params?.maxPrice) searchParams.set('maxPrice', params.maxPrice.toString());
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());

        const query = searchParams.toString();
        return this.request<{
            listings: Array<{
                id: string;
                sellerId: string;
                sellerName?: string;
                creditEntryId: string;
                projectId: string;
                projectName?: string;
                projectType?: string;
                quantityAvailable: number;
                pricePerCredit: number;
                currency: string;
                title: string;
                description: string | null;
                status: string;
                createdAt: string;
            }>;
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>(`/marketplace/listings${query ? `?${query}` : ''}`);
    }

    async getListing(id: string) {
        return this.request<{
            listing: {
                id: string;
                sellerId: string;
                creditEntryId: string;
                projectId: string;
                quantityAvailable: number;
                quantityOriginal: number;
                pricePerCredit: number;
                currency: string;
                title: string;
                description: string | null;
                status: string;
                expiresAt: string | null;
                createdAt: string;
            };
        }>(`/marketplace/listings/${id}`);
    }

    async createListing(data: {
        creditEntryId: string;
        quantity: number;
        pricePerCredit: number;
        title: string;
        description?: string;
        expiresInDays?: number;
    }) {
        return this.request<{
            listing: object;
        }>('/marketplace/listings', {
            method: 'POST',
            body: data,
        });
    }

    async purchaseListing(listingId: string, quantity: number) {
        return this.request<{
            purchase: object;
            message: string;
        }>('/marketplace/purchase', {
            method: 'POST',
            body: { listingId, quantity },
        });
    }

    // Verifications endpoints (for verifiers/admin)
    async getVerifications(params?: { status?: string; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.limit) searchParams.set('limit', params.limit.toString());

        const query = searchParams.toString();
        return this.request<{
            verifications: Array<{
                id: string;
                projectId: string;
                status: string;
                createdAt: string;
            }>;
        }>(`/verifications${query ? `?${query}` : ''}`);
    }

    async getVerification(id: string) {
        return this.request<{
            verification: {
                id: string;
                projectId: string;
                status: string;
                documents: Array<{ id: string; name: string; url: string }>;
                createdAt: string;
            };
        }>(`/verifications/${id}`);
    }

    async approveVerification(id: string, creditsToIssue: number, notes?: string) {
        return this.request<{
            verification: object;
        }>(`/verifications/${id}/approve`, {
            method: 'POST',
            body: { creditsToIssue, notes },
        });
    }

    async rejectVerification(id: string, reason: string) {
        return this.request<{
            verification: object;
        }>(`/verifications/${id}/reject`, {
            method: 'POST',
            body: { reason },
        });
    }

    async getCredit(id: string) {
        return this.request<{
            credit: {
                id: string;
                creditId: string;
                projectId: string;
                ownerId: string;
                quantity: number;
                vintage: number;
                status: string;
                issuedAt: string;
                lastActionAt: string;
                createdAt: string;
                updatedAt: string;
            };
        }>(`/credits/${id}`);
    }

    // File upload methods (use FormData for multipart uploads)
    async uploadImage(file: File): Promise<ApiResponse<{
        url: string;
        filename: string;
        originalName: string;
        size: number;
        mimetype: string;
    }>> {
        const formData = new FormData();
        formData.append('image', file);

        const headers: Record<string, string> = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/uploads/image`, {
                method: 'POST',
                headers,
                body: formData,
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                error: {
                    code: 'UPLOAD_ERROR',
                    message: error instanceof Error ? error.message : 'Upload failed',
                },
            };
        }
    }

    async uploadDocument(file: File): Promise<ApiResponse<{
        id: string;
        url: string;
        name: string;
        filename: string;
        type: string;
        size: number;
        mimetype: string;
        uploadedAt: string;
    }>> {
        const formData = new FormData();
        formData.append('document', file);

        const headers: Record<string, string> = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/uploads/document`, {
                method: 'POST',
                headers,
                body: formData,
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                error: {
                    code: 'UPLOAD_ERROR',
                    message: error instanceof Error ? error.message : 'Upload failed',
                },
            };
        }
    }

    async uploadDocuments(files: File[]): Promise<ApiResponse<{
        documents: Array<{
            id: string;
            url: string;
            name: string;
            filename: string;
            type: string;
            size: number;
            mimetype: string;
            uploadedAt: string;
        }>;
        count: number;
    }>> {
        const formData = new FormData();
        files.forEach(file => formData.append('documents', file));

        const headers: Record<string, string> = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/uploads/documents`, {
                method: 'POST',
                headers,
                body: formData,
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                error: {
                    code: 'UPLOAD_ERROR',
                    message: error instanceof Error ? error.message : 'Upload failed',
                },
            };
        }
    }

    // Project Documents endpoints
    async getProjectDocuments(projectId: string): Promise<ApiResponse<{
        documents: Array<{
            id: string;
            projectId: string;
            name: string;
            description?: string;
            fileUrl: string;
            fileSize: number;
            mimeType: string;
            uploadedBy: string;
            uploadedAt: string;
        }>;
        count: number;
    }>> {
        return this.request<{
            documents: Array<{
                id: string;
                projectId: string;
                name: string;
                description?: string;
                fileUrl: string;
                fileSize: number;
                mimeType: string;
                uploadedBy: string;
                uploadedAt: string;
            }>;
            count: number;
        }>(`/projects/${projectId}/documents`);
    }

    async uploadProjectDocument(projectId: string, file: File, name: string, description?: string): Promise<ApiResponse<{
        document: {
            id: string;
            projectId: string;
            name: string;
            description?: string;
            fileUrl: string;
            fileSize: number;
            mimeType: string;
            uploadedBy: string;
            uploadedAt: string;
        };
    }>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        if (description) {
            formData.append('description', description);
        }

        const headers: Record<string, string> = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/documents`, {
                method: 'POST',
                headers,
                body: formData,
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                error: {
                    code: 'UPLOAD_ERROR',
                    message: error instanceof Error ? error.message : 'Document upload failed',
                },
            };
        }
    }
}

export const api = new ApiClient();
export type { ApiResponse };
