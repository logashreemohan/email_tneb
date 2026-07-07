import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { Upload, Shield, CheckCircle, Download, X, Loader2, FileSpreadsheet, FileText, File } from 'lucide-react'
import toast from 'react-hot-toast'
import { localDB, useAuth } from '../../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { validateEmailClient } from '../../lib/emailValidatorClient'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const ACCEPTED = {
  'text/csv': ['.csv'], 'text/plain': ['.txt'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

function extractEmails(text) {
  const found = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []
  return [...new Set(found.map(e => e.trim().toLowerCase()))]
}

function FileIcon({ ext }) {
  if (['.xlsx', '.xls'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-green-600" />
  if (['.docx', '.doc'].includes(ext)) return <File className="w-5 h-5 text-blue-600" />
  return <FileText className="w-5 h-5 text-navy-600" />
}

export default function BulkValidate() {
  const { user }                  = useAuth()
  const [emails, setEmails]       = useState([])
  const [results, setResults]     = useState([])
  const [progress, setProgress]   = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [fileName, setFileName]   = useState('')
  const [fileExt, setFileExt]     = useState('')
  const [parsing, setParsing]     = useState(false)
  const abortRef                  = useRef(false)

  const parseFile = useCallback(async (file) => {
    setParsing(true)
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    setFileName(file.name); setFileExt(ext); setResults([])
    try {
      let found = []
      if (ext === '.csv') {
        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            complete: (res) => { found = extractEmails(res.data.flat().join(' ')); resolve() },
            error: reject,
          })
        })
      } else if (ext === '.txt') {
        found = extractEmails(await file.text())
      } else if (['.xlsx', '.xls'].includes(ext)) {
        const buf = await file.arrayBuffer()
        const wb  = XLSX.read(buf, { type: 'array' })
        let allText = ''
        wb.SheetNames.forEach(name => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
          allText += rows.flat().join(' ') + ' '
        })
        found = extractEmails(allText)
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        found = extractEmails(result.value)
      } else if (ext === '.doc') {
        found = extractEmails(await file.text())
        if (!found.length) toast('.doc: limited extraction. Try .docx or .txt', { icon: '⚠️', duration: 4000 })
      }
      if (!found.length) toast.error('No email addresses found in this file')
      else { setEmails(found); toast.success(`Found ${found.length} emails in ${file.name}`) }
    } catch (err) { toast.error('Failed to parse: ' + err.message) }
    finally { setParsing(false) }
  }, [])

  const onDrop = useCallback((accepted) => { if (accepted[0]) parseFile(accepted[0]) }, [parseFile])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxFiles: 1 })

  const startValidation = async () => {
    if (!emails.length) return toast.error('Upload a file first')
    setIsRunning(true); setResults([]); setProgress(0); abortRef.current = false
    let backendWorked = false
    try {
      const res = await fetch(`${API_URL}/api/validate/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, captchaToken: 'test', userId: user?.id }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        backendWorked = true
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done || abortRef.current) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n'); buf = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            try {
              const data = JSON.parse(line.slice(5))
              if (data.type === 'result') { setResults(prev => [...prev, data.result]); setProgress(data.progress); localDB.saveReport({ ...data.result, checked_by: user?.id }) }
              if (data.type === 'done') toast.success(`Done! ${data.valid} valid, ${data.invalid} invalid`)
            } catch {}
          }
        }
      }
    } catch {}
    if (!backendWorked) {
      toast('Using built-in validator', { icon: '⚡' })
      let done = 0
      for (let i = 0; i < emails.length; i += 10) {
        if (abortRef.current) break
        const batch = await Promise.all(emails.slice(i, i + 10).map(e => validateEmailClient(e)))
        for (const r of batch) { setResults(prev => [...prev, r]); localDB.saveReport({ ...r, checked_by: user?.id }) }
        done += batch.length
        setProgress(Math.min(Math.round((done / emails.length) * 100), 100))
        await new Promise(r => setTimeout(r, 0))
      }
      toast.success(`Validated ${emails.length} emails`)
    }
    setIsRunning(false)
  }

  const downloadCSV = () => {
    const rows = [['Email', 'Status', 'Reason'], ...results.map(r => [r.email, r.status, r.reason || ''])]
    const blob = new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' })
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'validation_report.csv' }).click()
  }
  const downloadXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(results.map(r => ({ Email: r.email, Status: r.status, Reason: r.reason || '' })))
    ws['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 60 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Results'); XLSX.writeFile(wb, 'validation_report.xlsx')
  }
  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text('TNEB – Email Validation Report', 14, 15)
    doc.setFontSize(9); doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${results.length}`, 14, 22)
    autoTable(doc, {
      startY: 28, head: [['Email', 'Status', 'Reason']],
      body: results.map(r => [r.email, r.status, r.reason || '']),
      headStyles: { fillColor: [30, 58, 138] }, styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    })
    doc.save('tneb_validation_report.pdf')
  }

  const valid   = results.filter(r => r.status === 'valid').length
  const invalid = results.filter(r => r.status === 'invalid').length

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2 mb-1">
          <Upload className="w-6 h-6 text-navy-600" /> Bulk Email Validation
        </h1>
        <p className="text-navy-400 text-sm">
          Supports&nbsp;
          {['.xlsx', '.xls'].map(e => <span key={e} className="font-mono text-green-700 font-semibold">{e} </span>)}
          {['.docx', '.doc'].map(e => <span key={e} className="font-mono text-blue-700 font-semibold">{e} </span>)}
          {['.csv', '.txt'].map(e =>  <span key={e} className="font-mono text-navy-700 font-semibold">{e} </span>)}
          · AI analysis · Export to CSV / XLSX / PDF
        </p>
      </div>

      {/* Step 1 – Upload */}
      <div className="card border-t-4 border-t-navy-600">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-navy-600 text-white flex items-center justify-center text-xs font-bold">1</div>
          <h3 className="font-bold text-navy-800">Upload File</h3>
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-navy-500 bg-navy-50' : 'border-blue-200 hover:border-navy-400 hover:bg-navy-50/50'}`}>
          <input {...getInputProps()} />
          {parsing ? (
            <div className="flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 text-navy-600 animate-spin" /><p className="text-navy-600 font-medium">Parsing file…</p></div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center gap-2"><Upload className="w-10 h-10 text-navy-600" /><p className="text-navy-700 font-semibold">Drop it here…</p></div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-3 text-navy-300" />
              <p className="text-navy-700 font-semibold">Drag & drop or click to browse</p>
              <p className="text-navy-400 text-sm mt-1">All email addresses are auto-extracted from the file</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  { label: '.xlsx', cls: 'bg-green-100 border-green-300 text-green-700', desc: 'Excel' },
                  { label: '.xls',  cls: 'bg-green-100 border-green-300 text-green-700', desc: 'Excel Legacy' },
                  { label: '.docx', cls: 'bg-blue-100 border-blue-300 text-blue-700',    desc: 'Word' },
                  { label: '.doc',  cls: 'bg-blue-100 border-blue-300 text-blue-700',    desc: 'Word Legacy' },
                  { label: '.csv',  cls: 'bg-navy-100 border-navy-300 text-navy-700',    desc: 'CSV' },
                  { label: '.txt',  cls: 'bg-slate-100 border-slate-300 text-slate-600', desc: 'Text' },
                ].map(f => (
                  <span key={f.label} className={`px-2.5 py-1 rounded-lg border text-xs font-mono ${f.cls}`}>
                    {f.label} <span className="text-slate-400 font-sans">{f.desc}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        {emails.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-navy-50 border border-navy-200 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <FileIcon ext={fileExt} />
              <span className="text-sm text-navy-700 font-medium truncate max-w-xs">{fileName}</span>
              <span className="badge-valid">{emails.length} emails</span>
            </div>
            <button onClick={() => { setEmails([]); setFileName(''); setFileExt(''); setResults([]) }}
              className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Step 2 – Run */}
      <div className={`card border-t-4 border-t-gold-500 ${!emails.length ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-gold-500 text-navy-900 flex items-center justify-center text-xs font-bold">2</div>
          <h3 className="font-bold text-navy-800">Run Validation</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={startValidation} disabled={isRunning} className="btn-primary">
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Validating… ({progress}%)</> : <><Shield className="w-4 h-4" />Start Validation</>}
          </button>
          {isRunning && (
            <button onClick={() => { abortRef.current = true; setIsRunning(false) }} className="btn-danger">
              <X className="w-4 h-4" /> Stop
            </button>
          )}
        </div>
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-navy-400 mb-1"><span>Processing…</span><span>{progress}%</span></div>
            <div className="w-full bg-navy-100 rounded-full h-2.5">
              <div className="bg-gradient-to-r from-navy-700 to-navy-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-navy-400 mt-2 font-mono">⚡ {results.length} / {emails.length} processed</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card border-t-4 border-t-green-500 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-navy-800 text-lg mb-1">Validation Results</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-700 font-semibold">✓ {valid} valid</span>
                <span className="text-red-700 font-semibold">✗ {invalid} invalid</span>
                <span className="text-navy-400">Total: {results.length}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={downloadCSV}  className="btn-outline text-sm py-2 px-3 gap-1"><Download className="w-4 h-4" /> CSV</button>
              <button onClick={downloadXLSX} className="btn-outline text-sm py-2 px-3 gap-1"><FileSpreadsheet className="w-4 h-4 text-green-600" /> XLSX</button>
              <button onClick={downloadPDF}  className="btn-primary text-sm py-2 px-3 gap-1"><Download className="w-4 h-4" /> PDF</button>
            </div>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-5 bg-slate-100">
            <div className="bg-green-500 transition-all duration-500" style={{ width: `${results.length ? (valid / results.length) * 100 : 0}%` }} />
            <div className="bg-red-500 transition-all duration-500"   style={{ width: `${results.length ? (invalid / results.length) * 100 : 0}%` }} />
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>Email Address</th><th>Status</th><th>Reason</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="text-navy-300 text-xs">{i + 1}</td>
                    <td className="font-mono text-xs">{r.email}</td>
                    <td>{r.status === 'valid' ? <span className="badge-valid">✓ Valid</span> : <span className="badge-invalid">✗ Invalid</span>}</td>
                    <td className="text-navy-400 text-xs max-w-xs">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
