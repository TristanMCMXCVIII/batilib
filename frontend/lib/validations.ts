import { z } from "zod";

// ─── Champs communs ───────────────────────────────────────

export const emailSchema = z
    .string()
    .min(1, "Email requis")
    .max(254, "Email trop long")
    .email("Email invalide");

export const orgNameSchema = z
    .string()
    .min(1, "Nom requis")
    .max(100, "Nom trop long (100 caractères max)");

export const slugSchema = z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug invalide");

export const workItemNameSchema = z
    .string()
    .min(1, "Nom requis")
    .max(200, "Nom trop long (200 caractères max)");

export const folderNameSchema = z
    .string()
    .min(1, "Nom requis")
    .max(100, "Nom trop long (100 caractères max)");

export const projectNameSchema = z
    .string()
    .min(1, "Nom requis")
    .max(150, "Nom trop long (150 caractères max)");

// ─── Enums ────────────────────────────────────────────────

export const orgInviteRoleSchema = z.enum(["MANAGER", "MEMBER"]);
export const orgMemberRoleSchema = z.enum(["MANAGER", "MEMBER"]);

// ─── Schémas de formulaires ───────────────────────────────

export const inviteMemberSchema = z.object({
    email: emailSchema,
    role: orgInviteRoleSchema,
});

export const updateOrganizationSchema = z.object({
    name:        orgNameSchema.optional(),
    description: z.string().max(500, "Description trop longue (500 caractères max)").optional(),
    siret:       z.string().max(14, "SIRET invalide").regex(/^\d{14}$/, "SIRET doit contenir 14 chiffres").optional().or(z.literal("")),
});
