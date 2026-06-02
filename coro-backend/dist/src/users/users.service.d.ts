import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
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
    findById(id: string): Promise<{
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
    createUser(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: any;
    }): Promise<{
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
    }>;
    updateUser(id: string, data: any): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        companyName: string | null;
        companyLogoB64: string | null;
    }>;
}
