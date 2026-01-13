'use client'

import { useCallback, useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Upload, FileText, CheckCircle, XCircle, Loader2, CloudUpload, Home, Car } from 'lucide-react'
import { toast } from 'sonner'

type SelectableInsuranceType = 'home' | 'auto' | 'both'

const INSURANCE_TYPE_OPTIONS: SelectableInsuranceType[] = ['home', 'auto', 'both']

export function PdfUploadZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [insuranceType, setInsuranceType] = useState<SelectableInsuranceType>('home')
  const { status, progress, error, extractionId, upload, reset } = useUpload()
  const router = useRouter()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      toast.error('Please upload a PDF file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const id = await upload(selectedFile, insuranceType)
      toast.success('Extraction complete!')
      router.push(`/review/${id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const handleReset = () => {
    reset()
    setSelectedFile(null)
    setInsuranceType('home')
  }

  if (status === 'success' && extractionId) {
    return (
      <Card className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
        <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Extraction Complete</h3>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Your document has been processed successfully. Review the extracted data before generating quotes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => router.push(`/review/${extractionId}`)}>
              Review Results
            </Button>
            <Button size="lg" variant="outline" onClick={handleReset}>
              Upload Another
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className="border-2 border-destructive bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Upload Failed</h3>
          <p className="text-muted-foreground mb-8 max-w-sm">{error}</p>
          <Button size="lg" onClick={handleReset}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <Card className="border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 px-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {status === 'uploading' ? 'Uploading Document' : 'Extracting Data'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm text-center">
            {status === 'uploading'
              ? 'Securely uploading your document to our servers'
              : 'AI is analyzing and extracting prospect information'}
          </p>
          <div className="w-full max-w-sm space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'hover:border-primary/50 hover:bg-muted/50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        {selectedFile ? (
          <>
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-1">{selectedFile.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>

            {/* Insurance Type Selector */}
            <div className="w-full max-w-md mb-8">
              <Label id="insurance-type-label" className="text-sm font-medium text-center block mb-3">
                Select Insurance Type
              </Label>
              <div
                role="radiogroup"
                aria-labelledby="insurance-type-label"
                className="flex rounded-lg border bg-muted/50 p-1 gap-1"
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                  const currentIndex = INSURANCE_TYPE_OPTIONS.indexOf(insuranceType)
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const nextIndex = (currentIndex + 1) % INSURANCE_TYPE_OPTIONS.length
                    setInsuranceType(INSURANCE_TYPE_OPTIONS[nextIndex])
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    const prevIndex = (currentIndex - 1 + INSURANCE_TYPE_OPTIONS.length) % INSURANCE_TYPE_OPTIONS.length
                    setInsuranceType(INSURANCE_TYPE_OPTIONS[prevIndex])
                  }
                }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={insuranceType === 'home'}
                  tabIndex={insuranceType === 'home' ? 0 : -1}
                  onClick={() => setInsuranceType('home')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    insuranceType === 'home'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Home
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={insuranceType === 'auto'}
                  tabIndex={insuranceType === 'auto' ? 0 : -1}
                  onClick={() => setInsuranceType('auto')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    insuranceType === 'auto'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Car className="h-4 w-4" aria-hidden="true" />
                  Auto
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={insuranceType === 'both'}
                  tabIndex={insuranceType === 'both' ? 0 : -1}
                  onClick={() => setInsuranceType('both')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    insuranceType === 'both'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  <span aria-hidden="true">+</span>
                  <Car className="h-4 w-4" aria-hidden="true" />
                  Both
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={handleUpload} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload & Extract
              </Button>
              <Button size="lg" variant="outline" onClick={() => setSelectedFile(null)}>
                Change File
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-colors",
              isDragging
                ? "bg-primary/20"
                : "bg-muted"
            )}>
              <CloudUpload className={cn(
                "h-10 w-10 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragging ? 'Drop your file here' : 'Drag and drop your PDF'}
            </h3>
            <p id="file-upload-description" className="text-muted-foreground mb-8 text-center max-w-sm">
              or click the button below to browse your files. We accept PDF documents up to 20MB.
              You can also drag and drop a file onto this area.
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileSelect}
                aria-describedby="file-upload-description"
              />
              <Button asChild size="lg" className="gap-2">
                <span>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Select PDF File
                </span>
              </Button>
            </label>
          </>
        )}
      </CardContent>
    </Card>
  )
}
