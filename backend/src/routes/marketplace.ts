import { Router, Request, Response, NextFunction } from 'express';
import { MarketplaceService } from '../application/services/MarketplaceService';
import { MarketplaceListingRepository } from '../infrastructure/repositories/MarketplaceListingRepository';
import { MarketplacePurchaseRepository } from '../infrastructure/repositories/MarketplacePurchaseRepository';
import { CreditEntryRepository } from '../infrastructure/repositories/CreditEntryRepository';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validation';
import {
    createListingSchema,
    updateListingSchema,
    purchaseSchema,
    listingsQuerySchema,
    ListingDto,
    PurchaseDto,
    ListingsResponse,
    ListingResponse,
    PurchaseResponse,
    PurchasesResponse,
} from '../application/dto/marketplace.dto';
import { logger } from '../utils/logger';
import { MarketplaceListing } from '../domain/entities/MarketplaceListing';
import { MarketplacePurchase } from '../domain/entities/MarketplacePurchase';

const router = Router();

// Lazy initialization
const getMarketplaceService = () => {
    return new MarketplaceService(
        new MarketplaceListingRepository(),
        new MarketplacePurchaseRepository(),
        new CreditEntryRepository()
    );
};

// Helper to map listing to DTO
const mapListingToDto = (listing: MarketplaceListing): ListingDto => ({
    id: listing.id,
    sellerId: listing.sellerId,
    creditEntryId: listing.creditEntryId,
    projectId: listing.projectId,
    quantityAvailable: listing.quantityAvailable,
    quantityOriginal: listing.quantityOriginal,
    pricePerCredit: listing.pricePerCredit,
    currency: listing.currency,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    expiresAt: listing.expiresAt?.toISOString() || null,
    createdAt: listing.createdAt.toISOString(),
});

// Helper to map purchase to DTO
const mapPurchaseToDto = (purchase: MarketplacePurchase): PurchaseDto => ({
    id: purchase.id,
    listingId: purchase.listingId,
    buyerId: purchase.buyerId,
    sellerId: purchase.sellerId,
    quantity: purchase.quantity,
    pricePerCredit: purchase.pricePerCredit,
    totalPrice: purchase.totalPrice,
    currency: purchase.currency,
    status: purchase.status,
    buyerCreditEntryId: purchase.buyerCreditEntryId,
    createdAt: purchase.createdAt.toISOString(),
    completedAt: purchase.completedAt?.toISOString() || null,
});

/**
 * @swagger
 * /api/v1/marketplace/listings:
 *   get:
 *     summary: Browse active listings
 *     description: Retrieve a paginated list of active carbon credit listings. Supports filtering by project ID, project type, and price range.
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *       - in: query
 *         name: projectType
 *         schema:
 *           type: string
 *         description: Filter by project type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price per credit
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per credit
 *     responses:
 *       200:
 *         description: A list of active listings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     listings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Listing'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/listings', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = listingsQuerySchema.parse(req.query);
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);

        const filters = {
            projectId: query.projectId,
            projectType: query.projectType,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
        };

        const service = getMarketplaceService();
        const { listings, total } = await service.getListings(filters, page, limit);

        const response: ListingsResponse = {
            status: 'success',
            data: {
                listings: listings.map(mapListingToDto),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
        };

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/marketplace/listings/{id}:
 *   get:
 *     summary: Get listing by ID
 *     description: Retrieve detailed information about a specific marketplace listing.
 *     tags: [Marketplace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     listing:
 *                       $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 */
router.get('/listings/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const service = getMarketplaceService();
        const listing = await service.getListing(id);

        if (!listing) {
            return res.status(404).json({
                status: 'error',
                code: 'LISTING_NOT_FOUND',
                message: 'Listing not found',
            });
        }

        const response: ListingResponse = {
            status: 'success',
            data: {
                listing: mapListingToDto(listing),
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
        };

        return res.status(200).json(response);
    } catch (error) {
        return next(error);
    }
});

/**
 * @swagger
 * /api/v1/marketplace/listings:
 *   post:
 *     summary: Create a new listing
 *     description: Create a new marketplace listing to sell carbon credits. Requires authentication.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creditEntryId
 *               - quantity
 *               - pricePerCredit
 *             properties:
 *               creditEntryId:
 *                 type: string
 *                 description: ID of the credit entry to sell
 *               quantity:
 *                 type: number
 *                 description: Amount of credits to sell
 *               pricePerCredit:
 *                 type: number
 *                 description: Price per credit in USD
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     listing:
 *                       $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Invalid request or insufficient credits
 */
router.post(
    '/listings',
    authenticate,
    validateRequest(createListingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.id;
            const { creditEntryId, quantity, pricePerCredit, title, description, expiresInDays } = req.body;

            // Get credit entry to find project ID
            const creditRepo = new CreditEntryRepository();
            const creditEntry = await creditRepo.findById(creditEntryId);
            if (!creditEntry) {
                return res.status(404).json({
                    status: 'error',
                    code: 'CREDIT_NOT_FOUND',
                    message: 'Credit entry not found',
                });
            }

            const service = getMarketplaceService();
            const listing = await service.createListing({
                sellerId: userId,
                creditEntryId,
                projectId: creditEntry.projectId,
                quantity,
                pricePerCredit,
                title,
                description,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
            });

            const response: ListingResponse = {
                status: 'success',
                data: {
                    listing: mapListingToDto(listing),
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: (req.headers['x-request-id'] as string) || 'unknown',
                },
            };

            return res.status(201).json(response);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found') || error.message.includes('Insufficient')) {
                    return res.status(400).json({
                        status: 'error',
                        code: 'INVALID_REQUEST',
                        message: error.message,
                    });
                }
            }
            return next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/marketplace/listings/{id}:
 *   put:
 *     summary: Update a listing
 *     description: Update specific fields of an active listing. Only the seller can update their listing.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pricePerCredit:
 *                 type: number
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     listing:
 *                       $ref: '#/components/schemas/Listing'
 *       403:
 *         description: Forbidden (Not the owner)
 *       404:
 *         description: Listing not found
 */
router.put(
    '/listings/:id',
    authenticate,
    validateRequest(updateListingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;
            const { pricePerCredit, title, description, expiresInDays } = req.body;

            const service = getMarketplaceService();
            const listing = await service.updateListing(id, userId, {
                pricePerCredit,
                title,
                description,
                expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
            });

            const response: ListingResponse = {
                status: 'success',
                data: {
                    listing: mapListingToDto(listing),
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: (req.headers['x-request-id'] as string) || 'unknown',
                },
            };

            return res.status(200).json(response);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    return res.status(404).json({
                        status: 'error',
                        code: 'LISTING_NOT_FOUND',
                        message: error.message,
                    });
                }
                if (error.message.includes('own')) {
                    return res.status(403).json({
                        status: 'error',
                        code: 'FORBIDDEN',
                        message: error.message,
                    });
                }
            }
            return next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/marketplace/listings/{id}:
 *   delete:
 *     summary: Cancel a listing
 *     description: Cancel an active listing. Credits will be returned to the seller's available balance.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing originally cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Listing cancelled successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Listing not found
 */
router.delete(
    '/listings/:id',
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            const service = getMarketplaceService();
            await service.cancelListing(id, userId);

            return res.status(200).json({
                status: 'success',
                data: {
                    message: 'Listing cancelled successfully',
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: (req.headers['x-request-id'] as string) || 'unknown',
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    return res.status(404).json({
                        status: 'error',
                        code: 'LISTING_NOT_FOUND',
                        message: error.message,
                    });
                }
                if (error.message.includes('own') || error.message.includes('cannot')) {
                    return res.status(403).json({
                        status: 'error',
                        code: 'FORBIDDEN',
                        message: error.message,
                    });
                }
            }
            return next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/marketplace/purchase:
 *   post:
 *     summary: Purchase credits from a listing
 *     description: Buy credits from an active listing using available balance. Transfers credits and records the transaction.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - quantity
 *             properties:
 *               listingId:
 *                 type: string
 *                 description: ID of the listing to purchase from
 *               quantity:
 *                 type: number
 *                 description: Amount of credits to buy
 *     responses:
 *       201:
 *         description: Purchase completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchase:
 *                       $ref: '#/components/schemas/Purchase'
 *       400:
 *         description: Invalid request or insufficient balance/quantity
 *       404:
 *         description: Listing not found
 */
router.post(
    '/purchase',
    authenticate,
    validateRequest(purchaseSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.id;
            const { listingId, quantity } = req.body;

            const service = getMarketplaceService();
            const purchase = await service.purchaseCredits(listingId, userId, quantity);

            const response: PurchaseResponse = {
                status: 'success',
                data: {
                    purchase: mapPurchaseToDto(purchase),
                    message: 'Purchase completed successfully',
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: (req.headers['x-request-id'] as string) || 'unknown',
                },
            };

            return res.status(201).json(response);
        } catch (error) {
            logger.error('Purchase error', { error });
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    return res.status(404).json({
                        status: 'error',
                        code: 'NOT_FOUND',
                        message: error.message,
                    });
                }
                if (error.message.includes('own') || error.message.includes('Insufficient') || error.message.includes('expired')) {
                    return res.status(400).json({
                        status: 'error',
                        code: 'INVALID_REQUEST',
                        message: error.message,
                    });
                }
            }
            return next(error);
        }
    }
);

/**
 * @swagger
 * /api/v1/marketplace/my-listings:
 *   get:
 *     summary: Get current user's listings
 *     description: Retrieve all active and cancelled listings for the authenticated seller.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user listings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     listings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Listing'
 */
router.get('/my-listings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const service = getMarketplaceService();
        const listings = await service.getSellerListings(userId);

        res.status(200).json({
            status: 'success',
            data: {
                listings: listings.map(mapListingToDto),
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/marketplace/my-purchases:
 *   get:
 *     summary: Get current user's purchases
 *     description: Retrieve all purchases made by the authenticated user.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchases:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Purchase'
 */
router.get('/my-purchases', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const service = getMarketplaceService();
        const purchases = await service.getBuyerPurchases(userId);

        const response: PurchasesResponse = {
            status: 'success',
            data: {
                purchases: purchases.map(mapPurchaseToDto),
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
        };

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/marketplace/my-sales:
 *   get:
 *     summary: Get current user's sales
 *     description: Retrieve all sales completed by the authenticated seller.
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user sales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchases:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Purchase'
 */
router.get('/my-sales', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const service = getMarketplaceService();
        const sales = await service.getSellerSales(userId);

        const response: PurchasesResponse = {
            status: 'success',
            data: {
                purchases: sales.map(mapPurchaseToDto),
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (req.headers['x-request-id'] as string) || 'unknown',
            },
        };

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

export const marketplaceRouter = router;
