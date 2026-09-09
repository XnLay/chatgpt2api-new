<template>
  <div class="space-y-6">
    <PagePanel v-if="loading" class="flex items-center justify-center p-10">
      <span class="text-sm text-muted-foreground">注册配置加载中...</span>
    </PagePanel>

    <div v-else-if="config" class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <!-- 左列：注册配置 -->
      <PagePanel class="space-y-5">
        <PanelHeader title="注册配置" align="start">
          <template #actions>
            <Button size="sm" variant="primary" :disabled="saving || config.enabled" @click="saveConfig">
              {{ saving ? '保存中...' : '保存配置' }}
            </Button>
          </template>
        </PanelHeader>

        <FormSection density="roomy">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label class="block text-xs">
              <span class="ui-field-label">注册模式</span>
              <GroupedSelectMenu
                :model-value="config.mode"
                :options="modeOptions"
                :disabled="config.enabled"
                aria-label="注册模式"
                selected-indicator="none"
                block
                @update:model-value="setMode($event as RegisterMode)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">注册总数</span>
              <Input
                :model-value="String(config.total)"
                type="number"
                :disabled="config.enabled || config.mode !== 'total'"
                block
                @update:model-value="setField('total', $event)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">线程数</span>
              <Input
                :model-value="String(config.threads)"
                type="number"
                :disabled="config.enabled"
                block
                @update:model-value="setField('threads', $event)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">注册代理</span>
              <Input
                :model-value="config.proxy"
                placeholder="http://127.0.0.1:7890"
                :disabled="config.enabled"
                block
                root-class="font-mono"
                @update:model-value="setField('proxy', $event)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">目标剩余额度</span>
              <Input
                :model-value="String(config.target_quota || '')"
                type="number"
                :disabled="config.enabled || config.mode !== 'quota'"
                block
                @update:model-value="setField('target_quota', $event)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">目标可用账号</span>
              <Input
                :model-value="String(config.target_available || '')"
                type="number"
                :disabled="config.enabled || config.mode !== 'available'"
                block
                @update:model-value="setField('target_available', $event)"
              />
            </label>
            <label class="block text-xs">
              <span class="ui-field-label">检查间隔（秒）</span>
              <Input
                :model-value="String(config.check_interval || '')"
                type="number"
                :disabled="config.enabled || config.mode === 'total'"
                block
                @update:model-value="setField('check_interval', $event)"
              />
            </label>
          </div>
        </FormSection>

        <div class="space-y-3 border-t border-border pt-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">邮箱配置</h3>
              <p class="mt-1 text-xs text-muted-foreground">可配置多个 provider，按启用顺序轮换。</p>
            </div>
            <Button size="sm" variant="outline" :disabled="config.enabled" @click="addProvider">添加</Button>
          </div>

          <FormSection density="roomy">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label class="block text-xs">
                <span class="ui-field-label">请求超时</span>
                <Input
                  :model-value="String(config.mail.request_timeout || '')"
                  type="number"
                  :disabled="config.enabled"
                  block
                  @update:model-value="setMailField('request_timeout', $event)"
                />
              </label>
              <label class="block text-xs">
                <span class="ui-field-label">等待验证码超时</span>
                <Input
                  :model-value="String(config.mail.wait_timeout || '')"
                  type="number"
                  :disabled="config.enabled"
                  block
                  @update:model-value="setMailField('wait_timeout', $event)"
                />
              </label>
              <label class="block text-xs">
                <span class="ui-field-label">轮询间隔</span>
                <Input
                  :model-value="String(config.mail.wait_interval || '')"
                  type="number"
                  :disabled="config.enabled"
                  block
                  @update:model-value="setMailField('wait_interval', $event)"
                />
              </label>
            </div>

            <label class="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <Checkbox
                class="mt-0.5"
                :model-value="config.mail.api_use_register_proxy !== false"
                :disabled="config.enabled"
                @update:model-value="setMailApiUseRegisterProxy"
              />
              <span class="space-y-1">
                <span class="block font-medium text-foreground">邮箱服务后台 API 使用注册代理</span>
                <span class="block leading-5 text-muted-foreground">关闭后邮箱平台 API 直连，注册 OpenAI/Auth0 请求仍使用注册代理。</span>
              </span>
            </label>

            <div
              v-for="(provider, index) in config.mail.providers"
              :key="index"
              class="space-y-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div class="flex items-center justify-between gap-3">
                <label class="flex items-center gap-2 text-xs text-foreground">
                  <Checkbox
                    :model-value="Boolean(provider.enable)"
                    :disabled="config.enabled"
                    @update:model-value="updateProvider(index, { enable: $event })"
                  />
                  启用
                </label>
                <Button
                  size="xs"
                  variant="outline"
                  :disabled="config.enabled || config.mail.providers.length <= 1"
                  @click="deleteProvider(index)"
                >
                  删除
                </Button>
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label class="block text-xs">
                  <span class="ui-field-label">类型</span>
                  <GroupedSelectMenu
                    :model-value="provider.type"
                    :options="providerTypeOptions"
                    :disabled="config.enabled"
                    :aria-label="`邮箱 provider 类型 ${index + 1}`"
                    selected-indicator="none"
                    block
                    @update:model-value="updateProviderType(index, $event)"
                  />
                </label>

                <label
                  v-if="needsApiBase(provider.type)"
                  class="block text-xs"
                >
                  <span class="ui-field-label">{{ provider.type === 'cloudmail_gen' ? 'CloudMail URL' : 'API Base' }}</span>
                  <Input
                    :model-value="String(provider.api_base || '')"
                    :disabled="config.enabled"
                    block
                    root-class="font-mono"
                    @update:model-value="updateProvider(index, { api_base: $event })"
                  />
                </label>

                <label v-if="provider.type === 'cloudmail_gen'" class="block text-xs">
                  <span class="ui-field-label">管理员邮箱</span>
                  <Input
                    :model-value="String(provider.admin_email || '')"
                    :disabled="config.enabled"
                    block
                    @update:model-value="updateProvider(index, { admin_email: $event })"
                  />
                </label>
                <label
                  v-if="provider.type === 'cloudmail_gen' || provider.type === 'cloudflare_temp_email' || provider.type === 'ddg_mail'"
                  class="block text-xs"
                >
                  <span class="ui-field-label">Admin Password</span>
                  <Input
                    :model-value="String(provider.admin_password || '')"
                    :disabled="config.enabled"
                    block
                    @update:model-value="updateProvider(index, { admin_password: $event })"
                  />
                </label>

                <label v-if="provider.type === 'ddg_mail'" class="block text-xs">
                  <span class="ui-field-label">DDG Token <span class="text-red-400">*</span></span>
                  <Input
                    :model-value="String(provider.ddg_token || '')"
                    :disabled="config.enabled"
                    placeholder="DuckDuckGo Email Protection 的 Bearer Token"
                    block
                    root-class="font-mono"
                    @update:model-value="updateProvider(index, { ddg_token: $event })"
                  />
                </label>
                <label v-if="provider.type === 'ddg_mail'" class="block text-xs">
                  <span class="ui-field-label">CF Inbox JWT <span class="text-red-400">*</span></span>
                  <Input
                    :model-value="String(provider.cf_inbox_jwt || '')"
                    :disabled="config.enabled"
                    placeholder="CF 临时邮箱后端的固定收件箱 JWT（DDG 转发目标）"
                    block
                    root-class="font-mono"
                    @update:model-value="updateProvider(index, { cf_inbox_jwt: $event })"
                  />
                </label>

                <label
                  v-if="needsApiKey(provider.type)"
                  class="block text-xs"
                >
                  <span class="ui-field-label">API Key</span>
                  <Input
                    :model-value="String(provider.api_key || '')"
                    :disabled="config.enabled"
                    block
                    root-class="font-mono"
                    @update:model-value="updateProvider(index, { api_key: $event })"
                  />
                </label>

                <label v-if="provider.type === 'duckmail' || provider.type === 'gptmail'" class="block text-xs">
                  <span class="ui-field-label">Default Domain</span>
                  <Input
                    :model-value="String(provider.default_domain || '')"
                    :placeholder="provider.type === 'duckmail' ? 'duckmail.sbs' : ''"
                    :disabled="config.enabled"
                    block
                    @update:model-value="updateProvider(index, { default_domain: $event })"
                  />
                </label>

                <label v-if="provider.type === 'yyds_mail'" class="block text-xs">
                  <span class="ui-field-label">Subdomain</span>
                  <Input
                    :model-value="String(provider.subdomain || '')"
                    :disabled="config.enabled"
                    block
                    @update:model-value="updateProvider(index, { subdomain: $event })"
                  />
                </label>

                <label v-if="provider.type === 'inbucket'" class="flex items-center gap-2 pt-6 text-xs text-foreground">
                  <Checkbox
                    :model-value="provider.random_subdomain ?? true"
                    :disabled="config.enabled"
                    @update:model-value="updateProvider(index, { random_subdomain: $event })"
                  />
                  启用随机子域名
                </label>

                <label v-if="provider.type === 'yyds_mail'" class="flex items-center gap-2 pt-6 text-xs text-foreground">
                  <Checkbox
                    :model-value="Boolean(provider.wildcard)"
                    :disabled="config.enabled"
                    @update:model-value="updateProvider(index, { wildcard: $event })"
                  />
                  Wildcard
                </label>
              </div>

              <div v-if="provider.type === 'ddg_mail'" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p class="mb-1 font-medium">使用说明</p>
                <ol class="list-inside list-decimal space-y-0.5">
                  <li>先在 <a href="https://duckduckgo.com/email/" target="_blank" class="underline">DuckDuckGo Email Protection</a> 登录并设置转发目标为 CF 收件箱地址</li>
                  <li>DDG Token 从浏览器 DevTools → Network → quack.duckduckgo.com 请求中获取 <code class="rounded bg-amber-100 px-1">Authorization: Bearer</code></li>
                  <li>CF Inbox JWT 从 CF 临时邮箱后端创建固定收件箱后获取</li>
                  <li>所有 @duck.com 别名收到的邮件会转发到同一个 CF 收件箱，系统按 To: 头自动匹配</li>
                </ol>
              </div>

              <label v-if="needsDomain(provider.type)" class="block text-xs">
                <span class="ui-field-label">{{ domainLabel(provider.type) }}</span>
                <textarea
                  :value="domainText(provider)"
                  :disabled="config.enabled"
                  :placeholder="domainPlaceholder(provider.type)"
                  rows="3"
                  class="block w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  @input="updateProvider(index, { domain: splitLines(($event.target as HTMLTextAreaElement).value) })"
                />
              </label>

              <label v-if="provider.type === 'cloudmail_gen'" class="block text-xs">
                <span class="ui-field-label">子域名（支持多个）</span>
                <textarea
                  :value="subdomainText(provider)"
                  :disabled="config.enabled"
                  rows="3"
                  placeholder="每行一个子域名前缀，留空则直接使用主域名"
                  class="block w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  @input="updateProvider(index, { subdomain: splitLines(($event.target as HTMLTextAreaElement).value) })"
                />
              </label>
            </div>
          </FormSection>
        </div>
      </PagePanel>

      <!-- 右列：运行结果 -->
      <PagePanel class="flex flex-col space-y-4">
        <PanelHeader title="运行结果" align="start">
          <template #copy>
            <p class="mt-1 text-xs text-muted-foreground">SSE 实时推送当前状态。</p>
          </template>
          <template #actions>
            <span
              class="rounded-md px-2 py-1 text-xs"
              :class="config.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'"
            >
              {{ config.enabled ? '运行中' : '已停止' }}
            </span>
          </template>
        </PanelHeader>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div
            v-for="metric in metricItems"
            :key="metric.label"
            class="min-w-0 border border-border bg-background px-3 py-2"
          >
            <div class="text-xs text-muted-foreground">{{ metric.label }}</div>
            <div class="mt-1 break-words text-base font-semibold text-foreground">{{ metric.value }}</div>
          </div>
        </div>

        <ActionRow gap="tight">
          <Button size="sm" variant="primary" :disabled="saving" @click="toggleRegister">
            {{ config.enabled ? '停止' : '启动' }}
          </Button>
          <Button size="sm" variant="outline" :disabled="saving || config.enabled" @click="resetRegister">重置</Button>
          <Button size="sm" variant="outline" :disabled="saving || config.enabled" @click="saveConfig">保存</Button>
        </ActionRow>

        <div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span class="shrink-0">⚠</span>
          启动之前注意先保存配置。
        </div>

        <div class="flex min-h-0 flex-1 flex-col space-y-3 border-t border-border pt-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-foreground">实时日志</h3>
              <p class="mt-1 text-xs text-amber-700">遇到 HTTP 状态码 400 等错误，基本是邮箱滥用被封，需要更换新的域名邮箱。</p>
            </div>
            <span class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{{ logs.length }}</span>
          </div>
          <div class="scrollbar-slim min-h-56 max-h-[28rem] overflow-y-auto border border-border bg-background p-3 font-mono text-xs leading-6">
            <div v-if="logs.length === 0" class="text-muted-foreground">暂无日志</div>
            <div
              v-for="(item, index) in reversedLogs"
              :key="`${item.time}-${index}`"
              class="break-words whitespace-pre-wrap"
              :class="logClass(item.level)"
            >
              <span class="text-muted-foreground">{{ formatLogTime(item.time) }}</span>
              <span class="pl-2">{{ item.text }}</span>
            </div>
          </div>
        </div>
      </PagePanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Button, Checkbox, GroupedSelectMenu, Input } from 'nanocat-ui'
import ActionRow from '@/components/ai/ActionRow.vue'
import FormSection from '@/components/ai/FormSection.vue'
import PagePanel from '@/components/ai/PagePanel.vue'
import PanelHeader from '@/components/ai/PanelHeader.vue'
import {
  registerApi,
  subscribeRegisterEvents,
  type RegisterConfig,
  type RegisterLogItem,
  type RegisterMailProvider,
  type RegisterMode,
} from '@/api/register'
import { useToast } from '@/composables/useToast'

const modeOptions = [
  { label: '注册总数', value: 'total' },
  { label: '号池剩余额度', value: 'quota' },
  { label: '可用账号数量', value: 'available' },
] as const

const providerTypeOptions = [
  { label: 'cloudmail_gen', value: 'cloudmail_gen' },
  { label: 'cloudflare_temp_email', value: 'cloudflare_temp_email' },
  { label: 'tempmail_lol', value: 'tempmail_lol' },
  { label: 'moemail', value: 'moemail' },
  { label: 'inbucket_mail', value: 'inbucket' },
  { label: 'duckmail', value: 'duckmail' },
  { label: 'gptmail(未测试)', value: 'gptmail' },
  { label: 'yyds_mail', value: 'yyds_mail' },
  { label: 'ddg_mail (DDG邮箱+CF中转)', value: 'ddg_mail' },
] as const

const config = ref<RegisterConfig | null>(null)
const loading = ref(true)
const saving = ref(false)
const toast = useToast()

let unsubscribe: (() => void) | null = null

const logs = computed<RegisterLogItem[]>(() => config.value?.logs || [])
const reversedLogs = computed<RegisterLogItem[]>(() => logs.value.slice().reverse())

const stats = computed(() => config.value?.stats || { success: 0, fail: 0, done: 0, running: 0, threads: 0 })

const metricItems = computed(() => [
  { label: '成功 / 成功率', value: `${stats.value.success} / ${stats.value.success_rate || 0}%` },
  { label: '失败', value: String(stats.value.fail) },
  { label: '完成', value: String(stats.value.done) },
  { label: '运行 / 线程', value: `${stats.value.running} / ${stats.value.threads}` },
  { label: '运行时间', value: `${stats.value.elapsed_seconds || 0}s` },
  { label: '平均注册单个', value: `${stats.value.avg_seconds || 0}s` },
  { label: '当前额度', value: String(stats.value.current_quota || 0) },
  { label: '正常账号', value: String(stats.value.current_available || 0) },
])

function applyConfig(next: RegisterConfig) {
  config.value = next
}

function setField(field: keyof RegisterConfig, value: string) {
  if (!config.value) return
  const numericFields = new Set(['total', 'threads', 'target_quota', 'target_available', 'check_interval'])
  const parsed = numericFields.has(field as string) && value !== '' ? Number(value) : value
  ;(config.value as Record<string, unknown>)[field as string] = parsed
}

function setMode(mode: RegisterMode) {
  if (!config.value) return
  config.value.mode = mode
}

function setMailField(field: 'request_timeout' | 'wait_timeout' | 'wait_interval', value: string) {
  if (!config.value) return
  const parsed = value !== '' ? Number(value) : value
  ;(config.value.mail as Record<string, unknown>)[field] = parsed
}

function setMailApiUseRegisterProxy(value: boolean) {
  if (!config.value) return
  config.value.mail.api_use_register_proxy = value
}

/** 各 provider 类型的默认字段模板，切换类型时重建，避免残留旧字段。 */
const PROVIDER_TYPE_DEFAULTS: Record<string, Partial<RegisterMailProvider>> = {
  cloudmail_gen: { api_base: '', admin_email: '', admin_password: '', domain: [], subdomain: [], email_prefix: '' },
  cloudflare_temp_email: { api_base: '', admin_password: '', domain: [] },
  tempmail_lol: { api_key: '', domain: [] },
  moemail: { api_base: '', api_key: '', domain: [] },
  inbucket: { api_base: '', domain: [], random_subdomain: true },
  duckmail: { api_key: '', default_domain: 'duckmail.sbs' },
  gptmail: { api_key: '', default_domain: '' },
  /** yyds_mail 支持 domain + subdomain 组合：domain 指定收件域名，subdomain 指定子域名前缀。 */
  yyds_mail: { api_base: 'https://tempmail.uxwi.de', api_key: '', domain: [], subdomain: '', wildcard: false },
  ddg_mail: { ddg_token: '', cf_inbox_jwt: '', cf_domain: [], admin_password: '' },
}

function updateProviderType(index: number, type: string) {
  updateProvider(index, { type, enable: true, ...PROVIDER_TYPE_DEFAULTS[type] })
}

function addProvider() {
  if (!config.value) return
  config.value.mail.providers.push({
    type: 'tempmail_lol',
    enable: true,
    api_key: '',
    domain: [],
  })
}

function updateProvider(index: number, patch: Partial<RegisterMailProvider>) {
  if (!config.value) return
  config.value.mail.providers[index] = {
    ...config.value.mail.providers[index],
    ...patch,
  }
}

function deleteProvider(index: number) {
  if (!config.value) return
  config.value.mail.providers.splice(index, 1)
}

function splitLines(value: string): string[] {
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean)
}

function needsApiBase(type: string) {
  return ['cloudmail_gen', 'cloudflare_temp_email', 'moemail', 'inbucket', 'yyds_mail', 'ddg_mail'].includes(type)
}

function needsApiKey(type: string) {
  return ['tempmail_lol', 'moemail', 'duckmail', 'gptmail', 'yyds_mail'].includes(type)
}

function needsDomain(type: string) {
  return ['cloudmail_gen', 'tempmail_lol', 'cloudflare_temp_email', 'moemail', 'inbucket', 'yyds_mail', 'ddg_mail'].includes(type)
}

function domainLabel(type: string) {
  if (type === 'cloudmail_gen') return '邮箱域名'
  if (type === 'inbucket') return '基础域名列表'
  return 'Domain'
}

function domainPlaceholder(type: string) {
  if (type === 'inbucket') return '每行一个基础域名，系统会自动生成随机子域名'
  if (type === 'moemail') return '每行一个域名'
  return '每行一个域名，留空则使用服务默认域名'
}

function domainText(provider: RegisterMailProvider) {
  return Array.isArray(provider.domain) ? provider.domain.map(String).join('\n') : ''
}

function subdomainText(provider: RegisterMailProvider) {
  return Array.isArray(provider.subdomain) ? provider.subdomain.map(String).join('\n') : ''
}

function logClass(level: string) {
  if (level === 'red') return 'text-rose-600'
  if (level === 'green') return 'text-emerald-700'
  if (level === 'yellow') return 'text-amber-700'
  return 'text-foreground'
}

function formatLogTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString()
}

async function loadConfig() {
  loading.value = true
  try {
    const response = await registerApi.get()
    applyConfig(response.register)
  } catch (error) {
    toast.error(`加载注册配置失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!config.value) return
  saving.value = true
  try {
    const response = await registerApi.update({
      mail: config.value.mail,
      proxy: config.value.proxy,
      total: config.value.total,
      threads: config.value.threads,
      mode: config.value.mode,
      target_quota: config.value.target_quota,
      target_available: config.value.target_available,
      check_interval: config.value.check_interval,
    })
    applyConfig(response.register)
    toast.success('注册配置已保存')
  } catch (error) {
    toast.error(`保存注册配置失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    saving.value = false
  }
}

async function toggleRegister() {
  if (!config.value) return
  saving.value = true
  try {
    const response = config.value.enabled ? await registerApi.stop() : await registerApi.start()
    applyConfig(response.register)
  } catch (error) {
    toast.error(`操作注册任务失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    saving.value = false
  }
}

async function resetRegister() {
  saving.value = true
  try {
    const response = await registerApi.reset()
    applyConfig(response.register)
  } catch (error) {
    toast.error(`重置注册任务失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadConfig()
  // SSE 实时同步运行状态与日志（含其他浏览器会话触发的启停）
  unsubscribe = subscribeRegisterEvents(applyConfig)
})

onUnmounted(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>
