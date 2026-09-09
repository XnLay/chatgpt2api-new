import apiClient, { getAuthToken, handleUnauthorizedResponse } from './client'

/** 注册机邮箱 provider 联合配置字段（与后端 mail_provider 支持的类型保持一致）。 */
export interface RegisterMailProvider {
  type: string
  enable: boolean
  api_base?: string
  api_key?: string
  admin_email?: string
  admin_password?: string
  domain?: string[]
  subdomain?: string[] | string
  email_prefix?: string
  default_domain?: string
  random_subdomain?: boolean
  wildcard?: boolean
  ddg_token?: string
  cf_inbox_jwt?: string
  cf_domain?: string[]
  [key: string]: unknown
}

export interface RegisterMailConfig {
  request_timeout: number
  wait_timeout: number
  wait_interval: number
  api_use_register_proxy: boolean
  providers: RegisterMailProvider[]
}

export interface RegisterStats {
  job_id?: string
  success: number
  fail: number
  done: number
  running: number
  threads: number
  elapsed_seconds?: number
  avg_seconds?: number
  success_rate?: number
  current_quota?: number
  current_available?: number
  started_at?: string
  updated_at?: string
}

export interface RegisterLogItem {
  time: string
  text: string
  level: string
}

export type RegisterMode = 'total' | 'quota' | 'available'

export interface RegisterConfig {
  mail: RegisterMailConfig
  proxy: string
  total: number
  threads: number
  mode: RegisterMode
  target_quota: number
  target_available: number
  check_interval: number
  enabled: boolean
  stats: RegisterStats
  logs: RegisterLogItem[]
}

export interface RegisterConfigUpdate {
  mail?: Partial<RegisterMailConfig>
  proxy?: string
  total?: number
  threads?: number
  mode?: RegisterMode
  target_quota?: number
  target_available?: number
  check_interval?: number
}

function apiUrl(path: string) {
  const baseUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  return baseUrl ? `${baseUrl}${path}` : path
}

export const registerApi = {
  get: () => apiClient.get<never, { register: RegisterConfig }>('/api/register'),

  update: (payload: RegisterConfigUpdate) =>
    apiClient.post<RegisterConfigUpdate, { register: RegisterConfig }>('/api/register', payload),

  start: () => apiClient.post<Record<string, never>, { register: RegisterConfig }>('/api/register/start', {}),

  stop: () => apiClient.post<Record<string, never>, { register: RegisterConfig }>('/api/register/stop', {}),

  reset: () => apiClient.post<Record<string, never>, { register: RegisterConfig }>('/api/register/reset', {}),
}

/**
 * 订阅注册机 SSE 实时状态流。
 * 返回清理函数：组件卸载时调用以关闭连接。
 */
export function subscribeRegisterEvents(onConfig: (config: RegisterConfig) => void): () => void {
  const token = getAuthToken()
  const url = new URL(apiUrl('/api/register/events'), window.location.origin)
  if (token) url.searchParams.set('token', token)

  const controller = new AbortController()
  const decoder = new TextDecoder()

  void (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        if (response.status === 401) handleUnauthorizedResponse()
        return
      }
      const reader = response.body.getReader()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''
        for (const block of blocks) {
          const dataLine = block
            .split('\n')
            .find(line => line.startsWith('data:'))
          if (!dataLine) continue
          try {
            onConfig(JSON.parse(dataLine.slice(5).trim()))
          } catch {
            // 忽略不完整的 JSON 块，等待下一帧补齐
          }
        }
      }
    } catch {
      // 连接中断时静默退出；调用方可根据需要重新订阅
    }
  })()

  return () => controller.abort()
}
