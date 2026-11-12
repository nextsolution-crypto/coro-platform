# Hardware comparison

| Class | Candidate evidence | Strengths | Open proof | Decision |
|---|---|---|---|---|
| Economic | ASUS NUC 14 Pro barebone | Ubuntu 24.04 support, HDMI/DP, 2.5 GbE, optional TPM/fTPM | exact SKU TPM, thermals, Canadian price/lifecycle | alternate |
| Professional | Lenovo ThinkCentre M70q Gen 5 | Ubuntu option, HDMI/DP, 1 GbE, discrete TCG/FIPS TPM on documented SKU, chassis lock | Ed25519 provider, quote, 24 h endurance | **reference pilot** |
| Industrial | OnLogic fanless industrial class | fanless, industrial mounting, dual network/display variants | current exact model, Ubuntu 24.04 certification, TPM/Ed25519, Canadian quote | harsh-site option |

Primary sources consulted 2026-11-12: Ubuntu 24.04.5 release announcement (`lists.ubuntu.com/archives/ubuntu-announce/2026-September/000327.html`), Lenovo M70q Gen 5 PSREF, ASUS NUC 14 Pro official specifications, and OnLogic official model data sheets. Prices were deliberately not inferred.

The M70q is chosen for the pilot because the exact professional SKU documents Ubuntu, physical security and discrete TPM. It is not a production procurement approval.
