import { useState, useEffect, useRef } from "react"
import { FolderDown, ArrowRight, OctagonX } from "lucide-react"
import { Button } from "@/components/custom/base/button"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import { qrCodeService } from "@/services/qrCodes/qrCodeService"
import type { QrCode } from "@/services/qrCodes/qrCodeServiceInterface"
import { useTheme } from "@/context/ThemeContext"
import { branchService } from "@/services/branches/branchService"
import type { Branch } from "@/services/branches/branchServiceInterface"

const applyApiUrl = (): string => {
  const env = import.meta.env.VITE_ENV;
  return env === 'PROD'
    ? import.meta.env.VITE_API_URL_PROD
    : import.meta.env.VITE_API_URL_DEV
};

interface QRGeneratorWidgetProps {
  onGoToTool?: () => void
  variant?: "default" | "widgetMini"
}

export const QRGeneratorWidget = ({ onGoToTool, variant = "default" }: QRGeneratorWidgetProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { selectedDealer } = useTheme()
  const qrRef = useRef<HTMLDivElement>(null)

  const [lastQRCode, setLastQRCode] = useState<QrCode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

  // Carregar branch do dealership
  useEffect(() => {
    const loadBranch = async () => {
      if (!selectedDealer?.idDealership) {
        setSelectedBranch(null)
        return
      }

      try {
        const branches = await branchService.getAllBranches({ idDealership: selectedDealer.idDealership })
        if (branches.length > 0) {
          setSelectedBranch(branches[0])
        } else {
          setSelectedBranch(null)
        }
      } catch (error) {
        console.error("Erro ao carregar filial:", error)
        setSelectedBranch(null)
      }
    }

    loadBranch()
  }, [selectedDealer])

  // Carregar o QR Code mais recente
  useEffect(() => {
    const loadLatestQR = async () => {
      if (!selectedBranch?.idBranch) {
        setLastQRCode(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const qrCodes = await qrCodeService.getQrCodesByIdBranch(selectedBranch.idBranch)
        if (qrCodes.length > 0) {
          // Ordenar por fecha de creación y tomar el más reciente
          const sorted = qrCodes.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setLastQRCode(sorted[0])
        } else {
          setLastQRCode(null)
        }
      } catch (error) {
        console.error("Erro ao carregar QR Code mais recente:", error)
        setLastQRCode(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadLatestQR()
  }, [selectedBranch])

  const handleGoToTool = () => {
    if (onGoToTool) {
      onGoToTool()
    } else {
      navigate("/gerador-de-qr-code")
    }
  }

  const handleDownloadPNG = async () => {
    if (!qrRef.current) return

    try {
      const svg = qrRef.current.querySelector("svg")
      if (!svg) return

      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      canvas.width = 512
      canvas.height = 512

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, 512, 512)
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.download = `qrcode-${Date.now()}.png`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        })
      }

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
    } catch (error) {
      console.error("Erro ao baixar PNG:", error)
    }
  }

  const handleDownloadSVG = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = `qrcode-${Date.now()}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  // Renderizado para variante widgetMini
  if (variant === "widgetMini") {
    return (
      <div className="flex flex-col gap-4 w-full px-6 py-4 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-slate-500">{t("Carregando...")}</p>
          </div>
        ) : lastQRCode ? (
          <>
            {/* Primeira linha: Título e QR Code */}
            <div className="flex flex-row gap-6 items-center justify-center">
              <h3 className="text-black">
                {t("Último QR code gerado")}
              </h3>
              <div className="border-l border-gray-300 h-12"></div>
              <div ref={qrRef} className="flex justify-center">
                <QRCodeSVG
                  value={lastQRCode.qrbaseUrl ? `${applyApiUrl()}/r/${lastQRCode.qrbaseUrl}` : lastQRCode.destinationUrl}
                  size={85}
                  fgColor={lastQRCode.fgColor}
                  level="H"
                  imageSettings={lastQRCode.logoUrl ? {
                    src: lastQRCode.logoUrl,
                    height: 20,
                    width: 20,
                    excavate: true,
                  } : undefined}
                  style={{
                    ...(lastQRCode.frame === "dots" && {
                      shapeRendering: "geometricPrecision",
                      borderRadius: "2em"
                    })
                  }}
                />
              </div>
            </div>

            {/* Segunda linha: Botões de Descarga - Lado a lado */}
            <div className="flex flex-row gap-2 justify-center">
              <Button
                variant="ghost"
                onClick={handleDownloadPNG}
                className="flex h-auto items-center justify-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
              >
                <FolderDown className="h-4 w-4 text-slate-600" />
                <div className="flex flex-col gap-0">
                  <p className="text-sm font-semibold text-slate-900 underline">{t("Baixe em PNG")}</p>
                  <p className="text-xs font-normal text-slate-500">{t("Melhor para compartilhar")}</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                onClick={handleDownloadSVG}
                className="flex h-auto items-center justify-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
              >
                <FolderDown className="h-4 w-4 text-slate-600" />
                <div className="flex flex-col gap-0">
                  <p className="text-sm font-semibold text-slate-900 underline">{t("Baixe em SVG")}</p>
                  <p className="text-xs font-normal text-slate-500">{t("Melhor para impressão")}</p>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 text-center">
            <OctagonX className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">{t("Nenhum QR code gerado")}</p>
          </div>
        )}
      </div>
    )
  }

  // Renderizado para variante default
  return (
    <div className="">
      <h2 className="text-black mb-4">
        {t("Último QR code gerado")}
      </h2>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-sm text-slate-500">{t("Carregando...")}</p>
        </div>
      ) : lastQRCode ? (
        <>
          <div className="flex flex-row items-start gap-6 mb-8 bg-background p-6">
            {/* QR Code Display */}
            <div ref={qrRef} className="">
              <QRCodeSVG
                value={lastQRCode.qrbaseUrl ? `${applyApiUrl()}/r/${lastQRCode.qrbaseUrl}` : lastQRCode.destinationUrl}
                size={150}
                fgColor={lastQRCode.fgColor}
                level="H"
                className="mx-auto"
                imageSettings={lastQRCode.logoUrl ? {
                  src: lastQRCode.logoUrl,
                  height: 24,
                  width: 24,
                  excavate: true,
                } : undefined}
                style={{
                  ...(lastQRCode.frame === "dots" && {
                    shapeRendering: "geometricPrecision",
                    borderRadius: "2em"
                  })
                }}
              />

              <p className="text-sm text-slate-600 mt-2 text-center"> {t("Criado por")}: {lastQRCode.user?.name}</p>
              <p className="text-sm text-slate-600 text-center"> {t("Data de criação")}: {new Date(lastQRCode.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <Button
                variant="link" 
                size="md"
                onClick={handleDownloadPNG}
                className="flex h-auto items-center justify-start gap-3 text-left hover:bg-slate-50 no-underline! p-0!"
              >
                <FolderDown className="h-5 w-5 text-slate-600" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-900 underline">{t("Baixe em PNG")}</p>
                  <p className="text-sm font-normal text-slate-500">{t("Melhor para compartilhar")}</p>
                </div>
              </Button>

              <Button
                variant="link" 
                size="md"
                onClick={handleDownloadSVG}
                className="flex h-auto items-center justify-start gap-3 text-left hover:bg-slate-50 no-underline! p-0!"
              >
                <FolderDown className="h-5 w-5 text-slate-600" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-900 underline">{t("Baixe em SVG")}</p>
                  <p className="text-sm font-normal text-slate-500">{t("Melhor para impressão")}</p>
                </div>
              </Button>
              <div className="">
                <Button
                  onClick={handleGoToTool}
                >
                  {t("Ir pra ferramenta")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <OctagonX className="h-10 w-10 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-900 mb-2">
            {t("Nenhum QR code gerado")}
          </p>
          <p className="text-sm text-slate-500 max-w-sm">
            {t("Você ainda não gerou nenhum QR code. Clique no botão abaixo para criar seu primeiro código.")}
          </p>
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleGoToTool}
            >
              {t("Ir pra ferramenta")}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
