import { useTranslation } from "react-i18next";
import siglaCargoPt from "@/assets/sigla-cargo-pt.png";
import siglaCargoEn from "@/assets/sigla-cargo-en.png";
import siglaCargoWhitePt from "@/assets/sigla-cargo-white-pt.png";
import siglaCargoWhiteEn from "@/assets/sigla-cargo-white-en.png";
import latopPt from "@/assets/latop-pt.png";
import latopEn from "@/assets/latop-en.png";

export function useLocalizedLogos() {
  const { i18n } = useTranslation();
  const isPt = i18n.language === "pt";

  return {
    siglaLogo: isPt ? siglaCargoPt : siglaCargoEn,
    siglaLogoWhite: isPt ? siglaCargoWhitePt : siglaCargoWhiteEn,
    latopLogo: isPt ? latopPt : latopEn,
  };
}
