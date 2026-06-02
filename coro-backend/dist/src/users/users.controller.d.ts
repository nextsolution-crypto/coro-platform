import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        companyName: string | null;
        companyLogo: string | null;
        companyLogoB64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    updateMe(req: any, body: any): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        companyName: string | null;
        companyLogoB64: string | null;
    }>;
    updateLogo(req: any, body: {
        companyLogoB64: string;
    }): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        companyName: string | null;
        companyLogoB64: string | null;
    }>;
}
