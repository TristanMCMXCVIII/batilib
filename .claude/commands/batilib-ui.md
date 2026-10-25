# Skill : BatiLib — UI & Design System

## Quand invoquer
Quand tu crées une nouvelle page ou un nouveau composant avec une UI non triviale.

---

## Tokens CSS disponibles (Tailwind)

| Classe Tailwind | Valeur | Usage |
|-----------------|--------|-------|
| `bg-background` | blanc pur | fond de page |
| `bg-surface` | #ffffff | cartes, modales |
| `bg-subtle` | gray-50 | sidebar, fonds secondaires, hover |
| `bg-hover` | gray-200 | survol interactif |
| `text-foreground` | gray-900 | texte principal |
| `text-muted-foreground` | gray-700 | descriptions, labels secondaires |
| `border-border` | gray-200 | bordures standard |
| `text-destructive` | red-600 | erreurs, danger |
| `text-success` | green-600 | succès |
| `text-warning` | amber-600 | avertissements |
| `text-info` | blue-600 | informations |

---

## Classes utilitaires définies dans globals.css

```
page-outer      → padding horizontal responsive (16px mobile / 40px tablette / 80px desktop)
page-title      → h1 de page
section-title   → h2 de section
body-sm         → texte corps 14px
caption         → texte secondaire 13px muted
text-error      → texte rouge erreur (messages de formulaire)
nav-item        → lien sidebar inactif
nav-item-active → lien sidebar actif
input-otp       → champ OTP centré monospace
avatar-initials → avatar fallback initiales (avec CSS vars --avatar-bg, --avatar-fg)
```

---

## Layout standard d'une page

Toujours utiliser `page-outer` pour le padding horizontal — jamais de `px-*` hardcodé.
Le contenu part du bord gauche du padding (pas de `mx-auto`).
Le h1 est toujours à `pt-8` (32px) depuis le header — cohérent sur toutes les pages.

**Page simple (sans onglets) :**
```tsx
<main className="page-outer pt-8 pb-10">
    <div className="max-w-2xl">          {/* ou max-w-5xl pour les tableaux */}
        <h1 className="page-title">Titre</h1>
        <p className="mt-2 caption">Sous-titre</p>
        {/* contenu */}
    </div>
</main>
```

**Page avec en-tête + onglets (layout dédié) :**
Le layout gère `page-outer pt-8` sur le header et `page-outer` sur le contenu.
Les composants enfants n'ont qu'à mettre `py-10 max-w-2xl`.

---

## Composants shadcn disponibles

`Button`, `Input`, `Label`, `Badge`, `Avatar`, `Card`,
`Sheet`, `Dialog`, `DropdownMenu`

### Badge — variants disponibles
```tsx
<Badge variant="success">Actif</Badge>
<Badge variant="neutral">En attente</Badge>
<Badge variant="warning">Attention</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="destructive">Erreur</Badge>
```

---

## Patterns UI récurrents

### Édition de formulaire → Sheet (panneau latéral)

L'overlay est défini globalement dans `components/ui/sheet.tsx` : `bg-black/10 backdrop-blur-[2px]`.
Ne jamais surcharger ces styles par composant.

```tsx
<Sheet open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
    <SheetContent>
        <SheetHeader>
            <SheetTitle>Titre</SheetTitle>
            <SheetDescription>Description.</SheetDescription>
        </SheetHeader>
        <div className="mt-8 space-y-5 px-1">
            {/* champs */}
            {error && <p className="text-error">{error}</p>}
            <Button onClick={save} disabled={saving} className="w-full">
                {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
        </div>
    </SheetContent>
</Sheet>
```

### Action destructive → Dialog avec confirmation
```tsx
<Dialog open={open} onOpenChange={(o) => { if (!loading) setOpen(o); }}>
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>Confirmer</DialogTitle>
            <DialogDescription>Action irréversible.</DialogDescription>
        </DialogHeader>
        {/* champ de confirmation si nécessaire */}
        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleAction} disabled={loading}>
                Confirmer
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

### État vide (liste ou section sans contenu)

Fond subtil + bordure ultra-légère. **Jamais de `border-dashed`** (réservé aux zones de drop/upload interactives).

```tsx
<div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
        <IconName className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="body-sm font-medium">Titre de l'état vide</p>
    <p className="mt-1 caption max-w-xs">
        Description courte et utile.
    </p>
    {/* Optionnel : bouton d'action */}
    <Button size="sm" variant="outline" className="mt-6" onClick={handleAction}>
        Action
    </Button>
</div>
```

---

### Section avec bouton modifier (FOUNDER only)
```tsx
<section>
    <div className="flex items-start justify-between">
        <h2 className="section-title">Titre section</h2>
        {canEdit && (
            <Button variant="outline" size="sm" onClick={openSheet}>
                <Pencil className="h-3.5 w-3.5" />
                Modifier
            </Button>
        )}
    </div>
    <div className="mt-5 space-y-4">
        {/* contenu */}
    </div>
</section>
```

---

## Conventions

- Mode clair uniquement — pas de `dark:` classes
- Icônes : `lucide-react` exclusivement
- Spinner : `<Loader2 className="h-4 w-4 animate-spin" />`
- Espacements sections : `space-y-16` entre sections d'une page
- Formulaires dans des Sheets, pas inline dans la page
- Pas de design system supplémentaire à installer

### Formes avatar/logo
- **Avatar utilisateur** : toujours `rounded-full` (cercle)
- **Logo organisation** : toujours `rounded-lg` ou `rounded-xl` (carré arrondi), jamais rond
- Upload avatar/logo : compression via `sharp` côté serveur (256×256, WebP qualité 85), limite 20 Mo en entrée. Routes : `/api/upload/avatar` et `/api/upload/org-logo`
