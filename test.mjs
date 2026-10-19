// node test.mjs —— 用假的 ctx 验证注册逻辑（不依赖真实 DSH）。
import assert from 'node:assert/strict'
import { apply, buildRule, DEFAULT_RULE } from './index.js'

function fakeCtx({ viaInject = true } = {}) {
  const sections = []
  const prompt = { section: (s) => { sections.push(s); return () => sections.splice(sections.indexOf(s), 1) } }
  const effects = []
  const scope = { get: (n) => (n === 'systemPrompt' ? prompt : undefined), effect: (f) => effects.push(f()) }
  const ctx = {
    logger: () => ({ info() {}, warn() {} }),
    inject: (deps, cb) => { if (viaInject) cb(scope) },
    get: (n) => (!viaInject && n === 'systemPrompt' ? prompt : undefined),
    effect: (f) => effects.push(f()),
  }
  return { ctx, sections, effects }
}

{ const t = fakeCtx(); apply(t.ctx, {}); assert.equal(t.sections.length, 1); assert.equal(t.sections[0].text, DEFAULT_RULE); assert.equal(t.sections[0].order, 5)
  t.effects[0](); assert.equal(t.sections.length, 0, 'disposer removes section') }
{ const t = fakeCtx({ viaInject: false }); apply(t.ctx, { order: 1 }); assert.equal(t.sections.length, 1); assert.equal(t.sections[0].order, 1) }
{ const t = fakeCtx(); apply(t.ctx, { enabled: false }); assert.equal(t.sections.length, 0) }
assert.equal(buildRule({ text: 'X', extra: 'Y' }), 'X\nY')
assert.match(buildRule({ extra: '报告结尾加一句总结' }), /报告结尾加一句总结$/)
assert.match(DEFAULT_RULE, /final report/)
console.log('ok')
