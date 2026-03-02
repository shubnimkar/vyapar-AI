'use client';

import { useState, useEffect } from 'react';
import { Language, UserProfile } from '@/lib/types';
import { t } from '@/lib/translations';
import AccountDeletion from './AccountDeletion';

interface UserSettingsProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export default function UserSettings({ language, onLanguageChange }: UserSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Editable fields
  const [editableData, setEditableData] = useState({
    shopName: '',
    userName: '',
    language: language,
    businessType: '',
    city: '',
    dataRetentionDays: 90,
    autoArchive: true,
    notificationsEnabled: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/profile');
      const result = await response.json();

      if (result.success && result.data) {
        setProfile(result.data);
        setEditableData({
          shopName: result.data.shopName,
          userName: result.data.userName,
          language: result.data.language,
          businessType: result.data.businessType || '',
          city: result.data.city || '',
          dataRetentionDays: result.data.preferences.dataRetentionDays,
          autoArchive: result.data.preferences.autoArchive,
          notificationsEnabled: result.data.preferences.notificationsEnabled,
        });
      } else {
        setError(result.error || t('error.profileUpdateFailed', language));
      }
    } catch (err) {
      console.error('[UserSettings] Error fetching profile:', err);
      setError(t('networkError', language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccessMessage('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: editableData.shopName,
          userName: editableData.userName,
          language: editableData.language,
          businessType: editableData.businessType || undefined,
          city: editableData.city || undefined,
          preferences: {
            dataRetentionDays: editableData.dataRetentionDays,
            autoArchive: editableData.autoArchive,
            notificationsEnabled: editableData.notificationsEnabled,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setProfile(result.data);
        setHasChanges(false);
        setSuccessMessage(t('success.profileUpdated', language));
        
        // Update language if changed
        if (editableData.language !== language) {
          onLanguageChange(editableData.language);
        }
      } else {
        setError(result.error || t('error.profileUpdateFailed', language));
      }
    } catch (err) {
      console.error('[UserSettings] Error saving profile:', err);
      setError(t('networkError', language));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'hi' ? 'लोड हो रहा है...' : language === 'mr' ? 'लोड होत आहे...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error || t('error.profileUpdateFailed', language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {t('settings.title', language)}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Profile Information Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('settings.profile', language)}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.setup.shopName', language)}
                </label>
                <input
                  type="text"
                  value={editableData.shopName}
                  onChange={(e) => handleFieldChange('shopName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.setup.userName', language)}
                </label>
                <input
                  type="text"
                  value={editableData.userName}
                  onChange={(e) => handleFieldChange('userName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.setup.language', language)}
                </label>
                <select
                  value={editableData.language}
                  onChange={(e) => handleFieldChange('language', e.target.value as Language)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.setup.businessType', language)}
                </label>
                <select
                  value={editableData.businessType}
                  onChange={(e) => handleFieldChange('businessType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">
                    {language === 'hi' ? 'चुनें' : language === 'mr' ? 'निवडा' : 'Select'}
                  </option>
                  <option value="retail">{t('businessType.retail', language)}</option>
                  <option value="wholesale">{t('businessType.wholesale', language)}</option>
                  <option value="services">{t('businessType.services', language)}</option>
                  <option value="manufacturing">{t('businessType.manufacturing', language)}</option>
                  <option value="other">{t('businessType.other', language)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.setup.city', language)}
                </label>
                <input
                  type="text"
                  value={editableData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Account Information Section (Read-only) */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('settings.account', language)}
            </h2>
            
            <div className="space-y-3 bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">{t('settings.phone', language)}:</span>
                <span className="text-sm text-gray-900">{profile.phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">{t('settings.createdAt', language)}:</span>
                <span className="text-sm text-gray-900">
                  {new Date(profile.createdAt).toLocaleDateString(
                    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">{t('settings.lastActive', language)}:</span>
                <span className="text-sm text-gray-900">
                  {new Date(profile.lastActiveAt).toLocaleDateString(
                    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Data Preferences Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('settings.preferences', language)}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.retentionDays', language)}: {editableData.dataRetentionDays}
                </label>
                <input
                  type="range"
                  min="30"
                  max="365"
                  step="1"
                  value={editableData.dataRetentionDays}
                  onChange={(e) => handleFieldChange('dataRetentionDays', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>30</span>
                  <span>90</span>
                  <span>180</span>
                  <span>365</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('settings.autoArchive', language)}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'hi' 
                      ? 'पुराना डेटा स्वचालित रूप से संग्रहित करें'
                      : language === 'mr'
                      ? 'जुना डेटा स्वयंचलितपणे संग्रहित करा'
                      : 'Automatically archive old data'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.autoArchive}
                    onChange={(e) => handleFieldChange('autoArchive', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('settings.notifications', language)}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'hi' 
                      ? 'महत्वपूर्ण अपडेट के लिए सूचनाएं प्राप्त करें'
                      : language === 'mr'
                      ? 'महत्त्वाच्या अपडेटसाठी सूचना मिळवा'
                      : 'Receive notifications for important updates'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editableData.notificationsEnabled}
                    onChange={(e) => handleFieldChange('notificationsEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving 
                ? (language === 'hi' ? 'सहेज रहा है...' : language === 'mr' ? 'जतन करत आहे...' : 'Saving...')
                : t('settings.save', language)
              }
            </button>
          </div>
        </div>

        {/* Account Deletion Section */}
        <div className="mt-8">
          <AccountDeletion
            language={language}
            deletionScheduledAt={profile.deletionScheduledAt}
            onDeletionRequested={fetchProfile}
            onDeletionCancelled={fetchProfile}
          />
        </div>
      </div>
    </div>
  );
}
