import React, { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  EmptyState,
  AppShell,
  PageHeader,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  GhostButton
} from './ui/Primitives.jsx';

export default function AlertsView({
  alerts = [],
  fieldId,
  fieldName = 'Farm Plot',
  language = 'en',
  onBack,
  onViewPlan,
  onMarkRead,
  onResolve
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'action' | 'upcoming' | 'resolved'
  const [processingId, setProcessingId] = useState(null);

  // Multilingual translations
  const t = {
    en: {
      backBtn: 'Back',
      title: 'Field Alerts & Risk Notices',
      subtitle: 'Monitoring active stress, upcoming weather, and past actions for',
      sectionAction: 'Needs Action',
      sectionUpcoming: 'Upcoming',
      sectionResolved: 'Resolved',
      emptyActionTitle: 'No Urgent Actions Needed',
      emptyActionDesc: 'All acute water stress conditions are resolved. Root moisture is sufficient.',
      emptyUpcomingTitle: 'No Upcoming Weather Hazards',
      emptyUpcomingDesc: 'No extreme heat spikes, heavy rainfall, or high wind warnings in the forecast.',
      emptyResolvedTitle: 'No Past Resolved Alerts',
      emptyResolvedDesc: 'Completed actions and historical alerts will appear here.',
      viewPlanBtn: "View today's plan",
      markReadBtn: 'Mark as read',
      resolveBtn: 'Resolve alert',
      resolvedAt: 'Resolved at',
      statusRead: 'Read',
      statusUnread: 'New',
      allFieldsFilter: 'All alerts',
      backToDashboardBtn: '← Return to Today dashboard'
    },
    hi: {
      backBtn: 'वापस',
      title: 'खेत अलर्ट व चेतावनियां',
      subtitle: 'जल तनाव, आगामी मौसम और पिछले कार्यों की निगरानी:',
      sectionAction: 'कार्रवाई आवश्यक',
      sectionUpcoming: 'आगामी',
      sectionResolved: 'समाधान हो चुका',
      emptyActionTitle: 'कोई तात्कालिक कार्रवाई आवश्यक नहीं',
      emptyActionDesc: 'सभी गंभीर जल संकट हल हो चुके हैं। मिट्टी में पर्याप्त नमी मौजूद है।',
      emptyUpcomingTitle: 'कोई आगामी मौसम जोखिम नहीं',
      emptyUpcomingDesc: 'अगले कुछ दिनों में अत्यधिक गर्मी या भारी बारिश की कोई चेतावनी नहीं है।',
      emptyResolvedTitle: 'कोई पिछला अलर्ट नहीं',
      emptyResolvedDesc: 'पूर्ण की गई कार्रवाइयां यहां दिखाई देंगी।',
      viewPlanBtn: 'आज की सिंचाई योजना देखें',
      markReadBtn: 'पढ़ा हुआ चिह्नित करें',
      resolveBtn: 'समाधान दर्ज करें',
      resolvedAt: 'समाधान समय',
      statusRead: 'पढ़ा गया',
      statusUnread: 'नया',
      allFieldsFilter: 'सभी अलर्ट',
      backToDashboardBtn: '← आज के डैशबोर्ड पर वापस जाएं'
    },
    gu: {
      backBtn: 'પાછા જાઓ',
      title: 'ખેતર ચેતવણીઓ અને જોખમો',
      subtitle: 'પાણી ખેંચ, આગામી હવામાન અને અગાઉના કાર્યોની ચકાસણી:',
      sectionAction: 'તાત્કાલિક કામ જરૂરી',
      sectionUpcoming: 'આગામી',
      sectionResolved: 'ઉકેલાયેલ',
      emptyActionTitle: 'કોઈ તાત્કાલિક પગલાં જરૂરી નથી',
      emptyActionDesc: 'પાણી ખેંચનું નિવારણ થઈ ગયું છે. જમીનમાં પૂરતો ભેજ સંગ્રહાયેલ છે.',
      emptyUpcomingTitle: 'કોઈ આગામી હવામાન જોખમ નથી',
      emptyUpcomingDesc: 'આગામી દિવસોમાં તીવ્ર લૂ કે ભારે વરસાદની કોઈ ચેતવણી નથી.',
      emptyResolvedTitle: 'કોઈ જૂની ચેતવણી નથી',
      emptyResolvedDesc: 'પૂર્ણ કરેલા કાર્યોનો ઇતિહાસ અહીં દેખાશે.',
      viewPlanBtn: 'આજનું પિયત આયોજન જુઓ',
      markReadBtn: 'વાંચેલું નોંધો',
      resolveBtn: 'ઉકેલ થયો નોંધો',
      resolvedAt: 'ઉકેલાયેલ સમય',
      statusRead: 'વાંચેલું',
      statusUnread: 'નવું',
      allFieldsFilter: 'બધી ચેતવણીઓ',
      backToDashboardBtn: '← આજના ડેશબોર્ડ પર પાછા જાઓ'
    }
  }[language] || {};

  // Segregate alerts strictly into the 3 required sections
  const actionAlerts = alerts.filter(
    (a) => a.status !== 'resolved' && a.category !== 'upcoming' && a.category !== 'resolved'
  );
  const upcomingAlerts = alerts.filter(
    (a) => a.category === 'upcoming' && a.status !== 'resolved'
  );
  const resolvedAlerts = alerts.filter(
    (a) => a.status === 'resolved' || a.category === 'resolved'
  );

  // Handle Mark as Read
  const handleMarkRead = async (id) => {
    if (!onMarkRead) return;
    setProcessingId(id);
    try {
      await onMarkRead(id);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Resolve
  const handleResolve = async (id) => {
    if (!onResolve) return;
    setProcessingId(id);
    try {
      await onResolve(id);
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to format date/time
  const formatAlertTime = (isoString) => {
    if (!isoString) return 'Today';
    const date = new Date(isoString);
    return date.toLocaleDateString(
      language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    );
  };

  // Render a single alert card
  const renderAlertCard = (alert, isResolved = false) => {
    const isHigh = alert.severity === 'high';
    const isMedium = alert.severity === 'medium';
    const badgeVariant = isResolved ? 'neutral' : isHigh ? 'high' : isMedium ? 'medium' : 'low';
    const severityLabel = isResolved
      ? 'RESOLVED'
      : isHigh
      ? 'HIGH RISK'
      : isMedium
      ? 'MEDIUM'
      : 'ADVISORY';

    return (
      <Card
        key={alert.id}
        as="article"
        aria-label={alert.title || 'Field Alert'}
        style={{
          borderLeft: isResolved
            ? '4px solid var(--border)'
            : isHigh
            ? '4px solid var(--risk)'
            : isMedium
            ? '4px solid var(--sun)'
            : '4px solid var(--leaf)',
          backgroundColor: isResolved ? 'var(--canvas)' : 'var(--surface)',
          padding: '16px',
          opacity: isResolved ? 0.85 : 1
        }}
      >
        {/* Header: Severity Badge, Title, Timestamp */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div className="flex items-center gap-2">
            <RiskBadge level={badgeVariant} label={severityLabel} />
            <span className="text-[10px] font-bold text-[var(--muted)]">
              {formatAlertTime(alert.createdAt)}
            </span>
          </div>
          {alert.status === 'unread' && !isResolved && (
            <span className="text-[10px] font-black uppercase text-[var(--risk)] bg-[#FCECEB] px-2 py-0.5 rounded-full">
              {t.statusUnread}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-extrabold text-[var(--ink)] leading-snug break-words">
          {alert.title || (isHigh ? 'Critical Water Deficit' : 'Weather Advisory')}
        </h3>

        {/* Plain-Language Message */}
        <p className="text-xs font-medium text-[var(--muted)] mt-1 leading-relaxed break-words">
          {alert.message}
        </p>

        {/* Resolved Timestamp metadata if present */}
        {alert.resolvedAt && (
          <p className="text-[10px] font-semibold text-[var(--forest)] mt-1.5 flex items-center gap-1">
            <span>✓</span>
            <span>{t.resolvedAt}: {formatAlertTime(alert.resolvedAt)}</span>
          </p>
        )}

        {/* Action Buttons */}
        {!isResolved && (
          <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
            {/* Contextual Action Button: "View today's plan" for irrigation alerts */}
            {alert.isIrrigationAlert ? (
              <PrimaryButton
                onClick={onViewPlan}
                className="text-xs py-1.5 px-3"
              >
                📋 {t.viewPlanBtn}
              </PrimaryButton>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              {alert.status === 'unread' && (
                <button
                  type="button"
                  disabled={processingId === alert.id}
                  onClick={() => handleMarkRead(alert.id)}
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  className="text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer inline-flex items-center focus-visible:ring-2 focus-visible:ring-[var(--forest)] rounded px-1"
                >
                  {t.markReadBtn}
                </button>
              )}
              <SecondaryButton
                disabled={processingId === alert.id}
                onClick={() => handleResolve(alert.id)}
                className="text-xs py-1.5 px-3"
              >
                ✓ {t.resolveBtn}
              </SecondaryButton>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const headerComponent = (
    <PageHeader
      title={t.title}
      icon="🔔"
      onBack={onBack}
      backLabel={t.backBtn}
      rightActions={
        <span className="text-xs font-bold text-[var(--muted)] px-2.5 py-1.5 bg-[var(--canvas)] rounded-lg border border-[var(--border)]">
          {fieldName}
        </span>
      }
    />
  );

  return (
    <AppShell header={headerComponent}>
      <div className="space-y-6">

        {/* SECTION 1: NEEDS ACTION */}
        <section aria-labelledby="section-action-heading" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              id="section-action-heading"
              className="text-xs font-black uppercase tracking-wider text-[var(--risk)] flex items-center gap-1.5"
            >
              <span>⚠️</span>
              <span>{t.sectionAction} ({actionAlerts.length})</span>
            </h2>
            {actionAlerts.length > 0 && (
              <span className="text-[10px] font-bold text-[var(--risk)] bg-[#FCECEB] px-2 py-0.5 rounded-full">
                Immediate Attention
              </span>
            )}
          </div>

          {actionAlerts.length === 0 ? (
            <EmptyState
              icon="🛡️"
              title={t.emptyActionTitle}
              description={t.emptyActionDesc}
              style={{ padding: '24px 16px' }}
            />
          ) : (
            <div className="space-y-2.5">
              {actionAlerts.map((a) => renderAlertCard(a, false))}
            </div>
          )}
        </section>

        {/* SECTION 2: UPCOMING */}
        <section aria-labelledby="section-upcoming-heading" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              id="section-upcoming-heading"
              className="text-xs font-black uppercase tracking-wider text-[var(--sun)] flex items-center gap-1.5"
            >
              <span>📅</span>
              <span>{t.sectionUpcoming} ({upcomingAlerts.length})</span>
            </h2>
            <span className="text-[10px] font-bold text-[var(--muted)]">
              Next 48 Hours
            </span>
          </div>

          {upcomingAlerts.length === 0 ? (
            <EmptyState
              icon="🌤️"
              title={t.emptyUpcomingTitle}
              description={t.emptyUpcomingDesc}
              style={{ padding: '24px 16px' }}
            />
          ) : (
            <div className="space-y-2.5">
              {upcomingAlerts.map((a) => renderAlertCard(a, false))}
            </div>
          )}
        </section>

        {/* SECTION 3: RESOLVED */}
        <section aria-labelledby="section-resolved-heading" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2
              id="section-resolved-heading"
              className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5"
            >
              <span>✓</span>
              <span>{t.sectionResolved} ({resolvedAlerts.length})</span>
            </h2>
            <span className="text-[10px] font-bold text-[var(--muted)]">
              Historical Log
            </span>
          </div>

          {resolvedAlerts.length === 0 ? (
            <EmptyState
              icon="📋"
              title={t.emptyResolvedTitle}
              description={t.emptyResolvedDesc}
              style={{ padding: '24px 16px' }}
            />
          ) : (
            <div className="space-y-2.5">
              {resolvedAlerts.map((a) => renderAlertCard(a, true))}
            </div>
          )}
        </section>

        {/* Return to Dashboard Bottom Button */}
        <div className="pt-2">
          <SecondaryButton
            onClick={onBack}
            className="w-full py-3 text-xs sm:text-sm font-bold justify-center"
          >
            {t.backToDashboardBtn}
          </SecondaryButton>
        </div>
      </div>
    </AppShell>
  );
}
