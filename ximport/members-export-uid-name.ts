/*
 * Script: members-export-uid-name.ts
 * Purpose: Export only uid (memberCode) and name (prefix + first + last)
 * Mapping Rules:
 *   uid  = memberInfo.memberCode || memberCode
 *   name = [memberInfo.prefix||prefix, memberInfo.firstName||firstName, memberInfo.lastName||lastName] (joined with single space)
 */
import axios from 'axios'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'

const API_URL = process.env.MEMBERS_API_URL?.trim() || 'https://devdata-gxd7b0aub3eufaf8.southeastasia-01.azurewebsites.net/api/fin-app/members'

interface MemberInfo { memberCode: string; prefix?: string; firstName?: string; lastName?: string }
interface MemberRecord extends Partial<MemberInfo> { memberCode: string; memberInfo?: MemberInfo; prefix?: string; firstName?: string; lastName?: string }
interface Row { uid: string; name: string }

function toRow(m: MemberRecord): Row {
  const info = m.memberInfo || ({} as MemberInfo)
  const uid = info.memberCode || m.memberCode || ''
  const name = [info.prefix || m.prefix, info.firstName || m.firstName, info.lastName || m.lastName].filter(Boolean).join(' ')
  return { uid, name }
}

async function main() {
  console.log('[members-export-uid-name] Fetching API:', API_URL)
  const { data } = await axios.get<MemberRecord[]>(API_URL, { headers: { Accept: 'application/json' } })
  if (!Array.isArray(data)) {
    console.error('Unexpected API response (not array)')
    process.exit(1)
  }
  const rows = data.map(toRow)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'UID_NAME')
  ws['!cols'] = [ { wch: 16 }, { wch: Math.min(50, Math.max(8, ...rows.map(r => r.name.length)) + 2) } ] as any
  const outDir = path.resolve(process.cwd(), 'ximport', 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `members-uid-name-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`)
  XLSX.writeFile(wb, outPath)
  console.log('[members-export-uid-name] XLSX saved to', outPath)
}

main().catch(err => { console.error('[members-export-uid-name] Failed:', err); process.exit(1) })
