import React, { useState } from 'react';
import { 
  Cloud, Lock, ChevronRight, Smartphone, Zap, 
  BarChart3, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { StorageConnection, MigrationJob } from '@/types/storage';
import {
  initiateGooglePhotosOAuth,
  initiateGoogleDriveOAuth,
  initiateICloudOAuth,
  startMigrationJob,
  fetchGooglePhotos,
  fetchGoogleDrivePhotos,
  fetchICloudPhotos,
  type MigrationJob as MigrationJobType
} from '@/lib/oauth-migration';

interface MobileMigrationProps {
  tenantId: string;
  destinations: StorageConnection[];
  onMigrationStart?: (job: MigrationJobType) => void;
  onMigrationComplete?: (job: MigrationJobType) => void;
}

/**
 * Mobile-First Photo Migration Component
 * - OAuth flows for iCloud, Google Photos, Google Drive
 * - Batch migration with progress tracking
 * - Optimized for touch/mobile interfaces
 */
export function MobileMigration({
  tenantId,
  destinations,
  onMigrationStart,
  onMigrationComplete
}: MobileMigrationProps) {
  const [selectedSource, setSelectedSource] = useState<'google-photos' | 'google-drive' | 'icloud' | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<StorageConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrationJobs, setMigrationJobs] = useState<MigrationJobType[]>([]);
  const [step, setStep] = useState<'select-source' | 'select-dest' | 'confirm' | 'migrating' | 'complete'>('select-source');

  const sources = [
    {
      id: 'google-photos',
      name: 'Google Photos',
      icon: '🔵',
      description: '2B+ users • Full library access',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: '📁',
      description: 'All images & videos in Drive',
      color: 'from-orange-500 to-red-600',
    },
    {
      id: 'icloud',
      name: 'iCloud Photos',
      icon: '🍎',
      description: 'iOS/macOS • Apple ecosystem',
      color: 'from-gray-400 to-gray-600',
    },
  ];

  const handleSourceSelect = async (sourceId: 'google-photos' | 'google-drive' | 'icloud') => {
    setSelectedSource(sourceId);
    setStep('select-dest');
  };

  const handleDestinationSelect = (dest: StorageConnection) => {
    setSelectedDestination(dest);
    setStep('confirm');
  };

  const handleStartMigration = async () => {
    if (!selectedSource || !selectedDestination) return;

    setLoading(true);
    setStep('migrating');

    try {
      // Initiate OAuth flow first
      if (selectedSource === 'google-photos') {
        initiateGooglePhotosOAuth();
      } else if (selectedSource === 'google-drive') {
        initiateGoogleDriveOAuth();
      } else if (selectedSource === 'icloud') {
        initiateICloudOAuth();
      }

      // After OAuth returns, the callback handler will start the migration
      // This is handled by the parent component via URL params
    } catch (error) {
      console.error('Migration start failed:', error);
      setStep('select-source');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step === 'select-dest') setStep('select-source');
    else if (step === 'confirm') setStep('select-dest');
    else setStep('select-source');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Mobile Photo Vault</h1>
        </div>
        <p className="text-lg text-slate-600">
          Migrate your photos from iCloud, Google Photos, or Google Drive to anywhere
        </p>
      </div>

      {step === 'select-source' && (
        <SelectSourceStep sources={sources} onSelect={handleSourceSelect} />
      )}

      {step === 'select-dest' && selectedSource && (
        <SelectDestinationStep
          source={sources.find(s => s.id === selectedSource)!}
          destinations={destinations}
          onSelect={handleDestinationSelect}
          onBack={handleGoBack}
        />
      )}

      {step === 'confirm' && selectedSource && selectedDestination && (
        <ConfirmStep
          source={sources.find(s => s.id === selectedSource)!}
          destination={selectedDestination}
          onConfirm={handleStartMigration}
          onBack={handleGoBack}
          loading={loading}
        />
      )}

      {step === 'migrating' && (
        <MigrationProgressStep migrationJobs={migrationJobs} />
      )}

      {step === 'complete' && (
        <MigrationCompleteStep
          jobs={migrationJobs}
          onReset={() => {
            setStep('select-source');
            setSelectedSource(null);
            setSelectedDestination(null);
            setMigrationJobs([]);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub Components ───

function SelectSourceStep({
  sources,
  onSelect,
}: {
  sources: any[];
  onSelect: (id: 'google-photos' | 'google-drive' | 'icloud') => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Photo Source</h2>
        <p className="text-slate-600 mb-8">Choose where your photos are currently stored</p>

        <div className="grid md:grid-cols-3 gap-4">
          {sources.map(source => (
            <button
              key={source.id}
              onClick={() => onSelect(source.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl p-6 text-left transition-all",
                "bg-gradient-to-br border-2 border-transparent",
                `${source.color} bg-gradient-to-br`,
                "hover:shadow-xl hover:scale-105 active:scale-95"
              )}
            >
              {/* Background blur effect */}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              
              <div className="relative z-10">
                <div className="text-4xl mb-3">{source.icon}</div>
                <h3 className="text-xl font-bold text-white mb-1">{source.name}</h3>
                <p className="text-white/80 text-sm mb-4">{source.description}</p>
                <div className="flex items-center text-white gap-2">
                  <span className="text-sm font-semibold">Get Started</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Features List */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Why CloudVault Pro for Migration?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Lightning Fast</p>
                <p className="text-sm text-slate-600">Batch migrate 10,000+ photos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Secure</p>
                <p className="text-sm text-slate-600">End-to-end encrypted transfers</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Cloud className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Any Cloud</p>
                <p className="text-sm text-slate-600">AWS, Azure, Vercel, and more</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectDestinationStep({
  source,
  destinations,
  onSelect,
  onBack,
}: {
  source: any;
  destinations: StorageConnection[];
  onSelect: (dest: StorageConnection) => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-4 mb-8">
          <div className="text-4xl">{source.icon}</div>
          <div>
            <p className="text-sm text-slate-600">Migrating from</p>
            <h2 className="text-2xl font-bold text-slate-900">{source.name}</h2>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Select Destination</h3>
          <div className="space-y-3">
            {destinations.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">No destinations available</p>
                  <p className="text-sm text-amber-800">Add a storage connection first</p>
                </div>
              </div>
            ) : (
              destinations.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => onSelect(dest)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    "hover:bg-blue-50 hover:border-blue-400 active:scale-95",
                    "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{dest.name}</p>
                      <p className="text-sm text-slate-600">
                        {dest.provider} • {dest.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmStep({
  source,
  destination,
  onConfirm,
  onBack,
  loading,
}: {
  source: any;
  destination: StorageConnection;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Confirm Migration</h2>

        {/* Route visualization */}
        <div className="flex items-center justify-between mb-8 p-6 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">{source.icon}</div>
            <p className="font-semibold text-slate-900">{source.name}</p>
          </div>
          <div className="flex-1 mx-4 flex items-center justify-center">
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-slate-300" />
            <ChevronRight className="w-6 h-6 text-slate-400 mx-2" />
            <div className="flex-1 h-1 bg-gradient-to-r from-slate-300 to-slate-200" />
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">☁️</div>
            <p className="font-semibold text-slate-900">{destination.name}</p>
            <p className="text-xs text-slate-600">{destination.provider}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span className="text-slate-600">Source</span>
            <span className="font-semibold text-slate-900">{source.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span className="text-slate-600">Destination</span>
            <span className="font-semibold text-slate-900">{destination.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span className="text-slate-600">Files to migrate</span>
            <span className="font-semibold text-slate-900">Counting...</span>
          </div>
        </div>

        {/* Security notice */}
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-900">
            Your photos are encrypted in transit and never stored on our servers
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={loading}
            className={cn(
              "flex-1 py-3 px-6 rounded-lg font-semibold transition-all",
              "border-2 border-slate-200 text-slate-900",
              "hover:bg-slate-50 disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 py-3 px-6 rounded-lg font-semibold transition-all",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Authorizing...
              </>
            ) : (
              'Start Migration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MigrationProgressStep({ migrationJobs }: { migrationJobs: MigrationJobType[] }) {
  const job = migrationJobs[0]; // Active job
  const progress = job ? (job.migratedFiles / job.totalFiles) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Migration in Progress</h2>

        <div className="space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-slate-900">Overall Progress</span>
              <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{job?.migratedFiles || 0}</p>
              <p className="text-sm text-slate-600">Migrated</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{job?.totalFiles || 0}</p>
              <p className="text-sm text-slate-600">Total</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">{job?.failedFiles || 0}</p>
              <p className="text-sm text-slate-600">Failed</p>
            </div>
          </div>

          {/* Status message */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Migrating your photos. Don't close this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MigrationCompleteStep({
  jobs,
  onReset,
}: {
  jobs: MigrationJobType[];
  onReset: () => void;
}) {
  const job = jobs[0];
  const successRate = job
    ? Math.round((job.migratedFiles / job.totalFiles) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Migration Complete!</h2>
        <p className="text-slate-600 mb-8">Your photos have been successfully migrated</p>

        {/* Results */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-600">Success Rate</span>
            <span className="text-2xl font-bold text-green-600">{successRate}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Files migrated</span>
              <span className="font-semibold">{job?.migratedFiles || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Files failed</span>
              <span className="font-semibold text-red-600">{job?.failedFiles || 0}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Migrate More Photos
        </button>
      </div>
    </div>
  );
}
