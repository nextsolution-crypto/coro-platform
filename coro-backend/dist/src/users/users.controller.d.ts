import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<{
        id: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        companyName: string | null;
        companyLogo: string | null;
        companyLogoB64: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    updateMe(req: any, body: any): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        companyName: string | null;
        companyLogoB64: string | null;
    }>;
    updateLogo(req: any, body: {
        companyLogoB64: string;
    }): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        companyName: string | null;
        companyLogoB64: string | null;
    }>;
}
