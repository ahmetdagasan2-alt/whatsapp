// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
'use client';

import { useState, useRef, useEffect } from 'react';
import type {
  WabaClientData,
  MessageTemplate,
  TemplateComponent,
  TemplateComponentParam,
  TemplateMediaParam,
  TemplateGatingData,
} from '@/app/types/api';
import { useT } from '@/app/i18n/client';

interface PaidMessagingDashboardProps {
  wabas: WabaClientData[];
}

type TabKey = 'template' | 'mm_lite';

// Extract {{N}} variables from a component's text
function extractVariables(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g);
  return [...new Set([...matches].map(m => parseInt(m[1], 10)))].sort((a, b) => a - b);
}

// Per-tab form state — each tab keeps its own in-progress message so switching
// tabs doesn't discard what the user has typed.
type TabFormState = {
  selectedTemplateKey: string;
  recipient: string;
  variableValues: Record<string, Record<number, string>>;
  mediaValues: Record<string, string>;
  campaignLabel: string;
  optInConfirmed: boolean;
  sending: boolean;
  error: string;
  success: string;
};

const emptyTabState: TabFormState = {
  selectedTemplateKey: '',
  recipient: '',
  variableValues: {},
  mediaValues: {},
  campaignLabel: '',
  optInConfirmed: false,
  sending: false,
  error: '',
  success: '',
};

export default function PaidMessagingDashboard({ wabas }: PaidMessagingDashboardProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabKey>('template');

  // Shared selections
  const [selectedWabaId, setSelectedWabaId] = useState('');
  const [selectedPhoneId, setSelectedPhoneId] = useState('');

  // Shared templates (loaded per WABA, filtered per tab at render time)
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [gating, setGating] = useState<TemplateGatingData | null>(null);

  // Per-tab form state
  const [templateForm, setTemplateForm] = useState<TabFormState>(emptyTabState);
  const [mmLiteForm, setMmLiteForm] = useState<TabFormState>(emptyTabState);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const paymentBlocked = gating !== null && !gating.hasPaymentMethod;
  const selectedWaba = wabas.find(w => w.id === selectedWabaId);
  const phones = selectedWaba?.phone_numbers?.data || [];

  const activeForm = activeTab === 'template' ? templateForm : mmLiteForm;
  const setActiveForm = activeTab === 'template' ? setTemplateForm : setMmLiteForm;

  // MM Lite is marketing-specific, so only surface MARKETING templates there.
  const visibleTemplates = activeTab === 'mm_lite'
    ? templates.filter(tpl => tpl.category === 'MARKETING')
    : templates;

  const selectedTemplate = activeForm.selectedTemplateKey
    ? visibleTemplates.find(tpl => `${tpl.name}::${tpl.language}` === activeForm.selectedTemplateKey)
    : null;

  const handleWabaChange = async (wabaId: string) => {
    setSelectedWabaId(wabaId);
    setSelectedPhoneId('');
    setTemplates([]);
    setGating(null);
    setTemplateForm(emptyTabState);
    setMmLiteForm(emptyTabState);

    if (!wabaId) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoadingTemplates(true);
    try {
      const res = await fetch(
        `/api/paid_messaging/templates?waba_id=${wabaId}`,
        { signal: abortControllerRef.current.signal }
      );
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || t('Failed to fetch templates', 'Şablonlar alınamadı');
        setTemplateForm(prev => ({ ...prev, error: msg }));
        setMmLiteForm(prev => ({ ...prev, error: msg }));
        return;
      }
      setTemplates(data.templates || []);
      if (data.gating) setGating(data.gating);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : t('Failed to fetch templates', 'Şablonlar alınamadı');
      setTemplateForm(prev => ({ ...prev, error: msg }));
      setMmLiteForm(prev => ({ ...prev, error: msg }));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const updateForm = (patch: Partial<TabFormState>) => {
    setActiveForm(prev => ({ ...prev, ...patch }));
  };

  const handleTemplateChange = (key: string) => {
    updateForm({
      selectedTemplateKey: key,
      variableValues: {},
      mediaValues: {},
      error: '',
      success: '',
    });
  };

  const setVariableValue = (componentType: string, varIndex: number, value: string) => {
    setActiveForm(prev => ({
      ...prev,
      variableValues: {
        ...prev.variableValues,
        [componentType]: { ...prev.variableValues[componentType], [varIndex]: value },
      },
    }));
  };

  const setMediaValue = (componentType: string, value: string) => {
    setActiveForm(prev => ({
      ...prev,
      mediaValues: { ...prev.mediaValues, [componentType]: value },
    }));
  };

  const buildComponentParams = (): TemplateComponentParam[] => {
    if (!selectedTemplate) return [];
    const params: TemplateComponentParam[] = [];

    for (const comp of selectedTemplate.components) {
      if (comp.type === 'HEADER') {
        if (comp.format && comp.format !== 'TEXT') {
          const url = activeForm.mediaValues['HEADER'] || '';
          if (!url) continue;
          const mediaType = comp.format.toLowerCase() as 'image' | 'video' | 'document';
          const param: TemplateMediaParam = mediaType === 'document'
            ? { type: 'document', document: { link: url } }
            : mediaType === 'video'
              ? { type: 'video', video: { link: url } }
              : { type: 'image', image: { link: url } };
          params.push({ type: 'header', parameters: [param] });
        } else if (comp.text) {
          const vars = extractVariables(comp.text);
          if (vars.length > 0) {
            const parameters: TemplateMediaParam[] = vars.map(v => ({
              type: 'text' as const,
              text: activeForm.variableValues['HEADER']?.[v] || '',
            }));
            params.push({ type: 'header', parameters });
          }
        }
      } else if (comp.type === 'BODY' && comp.text) {
        const vars = extractVariables(comp.text);
        if (vars.length > 0) {
          const parameters: TemplateMediaParam[] = vars.map(v => ({
            type: 'text' as const,
            text: activeForm.variableValues['BODY']?.[v] || '',
          }));
          params.push({ type: 'body', parameters });
        }
      }
    }
    return params;
  };

  const isFormValid = (): boolean => {
    if (!selectedWabaId || !selectedPhoneId || !activeForm.selectedTemplateKey || !activeForm.recipient) return false;
    if (!/^\+\d{7,15}$/.test(activeForm.recipient)) return false;
    if (!selectedTemplate) return false;

    for (const comp of selectedTemplate.components) {
      if (comp.type === 'HEADER' && comp.format && comp.format !== 'TEXT') {
        if (!activeForm.mediaValues['HEADER']) return false;
      }
      if ((comp.type === 'HEADER' || comp.type === 'BODY') && comp.text) {
        const vars = extractVariables(comp.text);
        for (const v of vars) {
          if (!activeForm.variableValues[comp.type]?.[v]) return false;
        }
      }
    }

    // MM Lite requires an explicit marketing opt-in attestation.
    if (activeTab === 'mm_lite' && !activeForm.optInConfirmed) return false;
    return true;
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    updateForm({ error: '', success: '', sending: true });

    const [templateName, templateLanguage] = activeForm.selectedTemplateKey.split('::');

    const payload: Record<string, unknown> = {
      waba_id: selectedWabaId,
      phone_number_id: selectedPhoneId,
      template_name: templateName,
      template_language: templateLanguage,
      recipient: activeForm.recipient,
      component_params: buildComponentParams(),
    };

    if (activeTab === 'mm_lite' && activeForm.campaignLabel.trim()) {
      payload.biz_opaque_callback_data = activeForm.campaignLabel.trim();
    }

    try {
      const res = await fetch('/api/paid_messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        updateForm({ error: data.error || t('Failed to send message', 'Mesaj gönderilemedi'), sending: false });
        return;
      }
      const messageId = data.messages?.[0]?.id || 'unknown';
      updateForm({
        success: t(
          `Message sent successfully! Message ID: ${messageId}`,
          `Mesaj başarıyla gönderildi! Mesaj ID: ${messageId}`,
        ),
        sending: false,
      });
    } catch (err: unknown) {
      updateForm({
        error: err instanceof Error ? err.message : t('Failed to send message', 'Mesaj gönderilemedi'),
        sending: false,
      });
    }
  };

  const renderVariableInputs = () => {
    if (!selectedTemplate) return null;

    return selectedTemplate.components.map((comp: TemplateComponent) => {
      if (comp.type === 'FOOTER') return null;

      if (comp.type === 'HEADER' && comp.format && comp.format !== 'TEXT') {
        const label = comp.format === 'IMAGE' ? t('Image URL', 'Görsel URL')
          : comp.format === 'VIDEO' ? t('Video URL', 'Video URL')
            : t('Document URL', 'Belge URL');
        return (
          <div key={`media-${comp.type}`} className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
              type="url"
              value={activeForm.mediaValues['HEADER'] || ''}
              onChange={e => setMediaValue('HEADER', e.target.value)}
              placeholder={t(`Enter ${label.toLowerCase()}...`, `${label} girin...`)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        );
      }

      if (!comp.text) return null;
      const vars = extractVariables(comp.text);
      if (vars.length === 0) return null;

      return (
        <div key={`vars-${comp.type}`} className="space-y-2">
          <p className="text-xs font-medium text-gray-500">{t(`${comp.type} variables`, `${comp.type} değişkenleri`)}</p>
          <p className="text-xs text-gray-400 font-mono">{comp.text}</p>
          {vars.map(v => (
            <div key={`${comp.type}-${v}`} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 flex-shrink-0">{`{{${v}}}`}</span>
              <input
                type="text"
                value={activeForm.variableValues[comp.type]?.[v] || ''}
                onChange={e => setVariableValue(comp.type, v, e.target.value)}
                placeholder={t(`Value for {{${v}}}`, `{{${v}}} için değer`)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          ))}
        </div>
      );
    });
  };

  const sendButtonLabel =
    activeTab === 'template'
      ? t('Send Template Message', 'Şablon Mesajı Gönder')
      : t('Send Marketing Message Lite', 'Pazarlama Mesajı Gönder');

  const templateEmptyLabel = !selectedWabaId
    ? t('Select a WABA first...', 'Önce bir WhatsApp hesabı seçin...')
    : paymentBlocked
      ? t('Payment method required', 'Ödeme yöntemi gerekli')
      : visibleTemplates.length === 0
        ? activeTab === 'mm_lite'
          ? t('No approved MARKETING templates found', 'Onaylı PAZARLAMA şablonu bulunamadı')
          : t('No approved templates found', 'Onaylı şablon bulunamadı')
        : t('Select a template...', 'Bir şablon seçin...');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5 max-w-2xl">
      {/* WABA selector */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{t('WABA', 'WhatsApp Hesabı (WABA)')}</label>
        <select
          value={selectedWabaId}
          onChange={e => handleWabaChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">{t('Select a WABA...', 'Bir WhatsApp hesabı seçin...')}</option>
          {wabas.map((waba, index) => (
            <option key={`${waba.id}-${index}`} value={waba.id}>
              {waba.name || waba.id}
            </option>
          ))}
        </select>
      </div>

      {/* Payment method warning — applies to both tabs */}
      {paymentBlocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800">{t('Payment method required', 'Ödeme yöntemi gerekli')}</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {t(
              'This WABA does not have a payment method attached. Add a payment method in your WhatsApp Business Manager to send paid messages.',
              'Bu WhatsApp hesabına bağlı bir ödeme yöntemi yok. Ücretli mesaj göndermek için WhatsApp Business Manager üzerinden ödeme yöntemi ekleyin.',
            )}
          </p>
        </div>
      )}

      {/* Phone selector */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{t('Phone Number', 'Telefon Numarası')}</label>
        <select
          value={selectedPhoneId}
          onChange={e => setSelectedPhoneId(e.target.value)}
          disabled={!selectedWabaId || paymentBlocked}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50"
        >
          <option value="">
            {!selectedWabaId
              ? t('Select a WABA first...', 'Önce bir WhatsApp hesabı seçin...')
              : paymentBlocked
                ? t('Payment method required', 'Ödeme yöntemi gerekli')
                : phones.length === 0
                  ? t('No phones registered for this WABA', 'Bu hesapta kayıtlı numara yok')
                  : t('Select a phone number...', 'Bir telefon numarası seçin...')}
          </option>
          {phones.map(phone => (
            <option key={phone.id} value={phone.id}>
              {phone.display_phone_number} ({phone.verified_name})
            </option>
          ))}
        </select>
      </div>

      {/* Tab strip */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label={t('Paid messaging options', 'Ücretli mesaj seçenekleri')}>
          {([
            { key: 'template', label: t('Template Messages', 'Şablon Mesajları') },
            { key: 'mm_lite', label: t('Marketing Messages Lite', 'Pazarlama Mesajları (Lite)') },
          ] as const).map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* MM Lite tab intro */}
      {activeTab === 'mm_lite' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-sm font-medium text-indigo-900">{t('Marketing Messages Lite', 'Pazarlama Mesajları (Lite)')}</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            {t('Send marketing template messages through the MM Lite flow. Only', 'Pazarlama şablon mesajlarını MM Lite akışıyla gönderin. Aşağıda yalnızca')}{' '}
            <strong>{t('MARKETING', 'PAZARLAMA')}</strong>
            {t(
              '-category templates are shown below. Recipients must have opted in to receive marketing messages from this business.',
              ' kategorisindeki şablonlar listelenir. Alıcıların bu işletmeden pazarlama mesajı almayı onaylamış olması gerekir.',
            )}
          </p>
        </div>
      )}

      {/* Template selector */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{t('Message Template', 'Mesaj Şablonu')}</label>
        {loadingTemplates ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('Loading templates...', 'Şablonlar yükleniyor...')}
          </div>
        ) : (
          <select
            value={activeForm.selectedTemplateKey}
            onChange={e => handleTemplateChange(e.target.value)}
            disabled={!selectedWabaId || paymentBlocked || visibleTemplates.length === 0}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-50"
          >
            <option value="">{templateEmptyLabel}</option>
            {visibleTemplates.map(template => (
              <option
                key={`${template.name}-${template.language}`}
                value={`${template.name}::${template.language}`}
              >
                {template.name} ({template.language})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Template preview + variable inputs */}
      {selectedTemplate && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('Template Variables', 'Şablon Değişkenleri')}</p>
          {renderVariableInputs()}
          {selectedTemplate.components.find(c => c.type === 'FOOTER') && (
            <p className="text-xs text-gray-400 italic">
              {t('Footer', 'Alt bilgi')}: {selectedTemplate.components.find(c => c.type === 'FOOTER')?.text}
            </p>
          )}
        </div>
      )}

      {/* Recipient */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{t('Recipient Phone Number', 'Alıcı Telefon Numarası')}</label>
        <input
          type="tel"
          value={activeForm.recipient}
          onChange={e => updateForm({ recipient: e.target.value, error: '', success: '' })}
          disabled={paymentBlocked}
          placeholder="+1234567890"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
        {activeForm.recipient && !/^\+\d{7,15}$/.test(activeForm.recipient) && (
          <p className="text-xs text-red-500 mt-1">
            {t('Phone number must be in E.164 format (e.g., +1234567890)', 'Telefon numarası uluslararası formatta olmalıdır (ör. +905551234567)')}
          </p>
        )}
      </div>

      {/* MM Lite-only fields */}
      {activeTab === 'mm_lite' && (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              {t('Campaign tracking label', 'Kampanya takip etiketi')}{' '}
              <span className="text-gray-400 font-normal">{t('(optional)', '(isteğe bağlı)')}</span>
            </label>
            <input
              type="text"
              value={activeForm.campaignLabel}
              onChange={e => updateForm({ campaignLabel: e.target.value })}
              disabled={paymentBlocked}
              placeholder={t('e.g. spring-2026-promo', 'ör. bahar-2026-kampanya')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('Passed as', 'Teslim/okundu bildirimlerini kampanyayla eşleştirebilmeniz için')}{' '}
              <code className="font-mono">biz_opaque_callback_data</code>{' '}
              {t('so you can correlate delivery/read webhooks to a campaign.', 'olarak iletilir.')}
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeForm.optInConfirmed}
              onChange={e => updateForm({ optInConfirmed: e.target.checked })}
              disabled={paymentBlocked}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <span className="text-sm text-gray-700">
              {t(
                'I confirm the recipient has opted in to receive marketing messages from this business.',
                'Alıcının bu işletmeden pazarlama mesajı almayı onayladığını teyit ediyorum.',
              )}
            </span>
          </label>
        </>
      )}

      {/* Error / Success */}
      {activeForm.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{activeForm.error}</p>
        </div>
      )}
      {activeForm.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">{activeForm.success}</p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!isFormValid() || activeForm.sending}
        className="w-full py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {activeForm.sending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('Sending...', 'Gönderiliyor...')}
          </>
        ) : (
          sendButtonLabel
        )}
      </button>
    </div>
  );
}
