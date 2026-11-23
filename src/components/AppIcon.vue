<script setup>
import { computed } from 'vue'
import {
  LayoutDashboard, ClipboardList, Users, Fish, Wheat, Vault, ReceiptText, IdCard, ChartPie, ChartColumn,
  Settings, Plus, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, Menu, Search, TriangleAlert, Clock3,
  CalendarDays, ChevronDown, ChevronRight, Check, X, Trash2, Inbox, Save, Truck, Send, Printer, UserRound, Info, Phone, Banknote, FileSpreadsheet, MessageCircle, LayoutGrid, Rows3, ChevronLeft, Pencil, Link2, Snowflake, Fuel, Package, Wrench, Zap, Building2, Coffee, FileText, Ellipsis, Repeat, Target,
  HandCoins, LogOut, GripVertical, Hand, Grab, ArrowDown, UserCheck, Scale, Crown, Handshake, Wallet, Shield,
} from 'lucide-vue-next'

// One modern, consistent icon set (Lucide), always drawn at the same weight. Names stay ours, so pages never import icons directly.
const ICONS = {
  home: LayoutDashboard, sheet: ClipboardList, traders: Users, farm: Fish, feed: Wheat, safe: Vault,
  receipt: ReceiptText, staff: IdCard, share: ChartPie, report: ChartColumn, gear: Settings,
  plus: Plus, in: ArrowDownToLine, out: ArrowUpFromLine, lock: LockKeyhole, menu: Menu, search: Search,
  alert: TriangleAlert, clock: Clock3, calendar: CalendarDays, chevron: ChevronDown, back: ChevronRight,
  check: Check, x: X, trash: Trash2, inbox: Inbox, save: Save, truck: Truck, send: Send, print: Printer,
  user: UserRound, info: Info, phone: Phone, cash: Banknote, excel: FileSpreadsheet, whatsapp: MessageCircle, grid: LayoutGrid, rows: Rows3, next: ChevronLeft, edit: Pencil, link: Link2, ice: Snowflake, fuel: Fuel, box: Package, wrench: Wrench, bolt: Zap, building: Building2, coffee: Coffee, doc: FileText, dots: Ellipsis, repeat: Repeat, target: Target, hand: HandCoins, logout: LogOut, grip: GripVertical, pointhand: Hand, grab: Grab, down: ArrowDown, ucheck: UserCheck, scale: Scale, crown: Crown, handshake: Handshake, wallet: Wallet, shield: Shield,
}
const props = defineProps({ name: { type: String, required: true } })
const icon = computed(() => ICONS[props.name] || Info)
</script>

<template>
  <component :is="icon" class="ic" :stroke-width="1.9" aria-hidden="true" />
</template>
