import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const AdminRoles = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
