# Scénarios de démonstration — Nextiaa Voice

> ⚠️ Toutes les données ci-dessous sont **fictives**. Ne jamais utiliser de
> données réelles pendant une démo (niveau gratuit Gemini).

Ces scénarios seront finalisés au fil des jalons (contenu complet au J7).
Prérequis : `npm run dev`, `.env` avec `GEMINI_API_KEY`, micro autorisé.

## Scénario A — Codes et récapitulatif SMS

1. Composer `8000`. L'assistant se présente comme assistant virtuel.
2. Dire : « Bonsoir, je veux les codes pour acheter un forfait internet Orange. »
3. L'assistant consulte la base et lit la fiche d'exemple **lentement**.
4. Dire : « Envoie-moi ça par SMS. » L'assistant demande confirmation, puis le
   SMS apparaît dans l'application SMS du téléphone.
5. Demander un code **absent** de la base : l'assistant dit qu'il n'a pas cette
   information vérifiée et propose une solution (SMS de suivi / transfert).

## Scénario B — Dépannage machine à laver

1. Dire : « Ma machine à laver ne vidange plus. »
2. L'assistant demande la marque/modèle, rappelle de **débrancher**, guide
   étape par étape.
3. Dire : « Ça sent le brûlé. » L'assistant **arrête** le guidage et propose un
   ticket technicien avec une référence (`NXV-...`).

## Scénario C — Suivi de dossier d'assurance

1. Dire : « Je veux savoir où en est mon dossier de sinistre. »
2. L'assistant envoie un **code par SMS** simulé et le demande.
3. Donner le code, puis la référence `SIN-2026-002`. L'assistant annonce l'état
   et la prochaine étape.
4. Dire : « Je veux parler à quelqu'un. » Transfert simulé, visible dans la
   console.

## Scénario D — Parcours USSD sans crédit

1. Composer `#136#`, choisir **1**.
2. Le téléphone **sonne** ; décrocher : l'assistant accueille l'appelant en
   précisant qu'il s'agit d'un **rappel**.

## Scénario E — Robustesse

Refaire le scénario A **en anglais**, puis **en camfranglais**, avec le **mode
qualité téléphone** activé et un bruit de fond (musique, rue).
