
export enum AppView {
  TRANSCRIPTION = 'transcription',
  TRANSLATION = 'translation'
}

export type SpeakerGender = 'male' | 'female' | 'neutral';

export type TranscriptMessage = {
  type: 'partial' | 'final';
  id: string;
  timestamp: number;
  sourceLang: string;
  targetLang?: string;
  originalText: string;
  translatedText?: string;
  gender?: SpeakerGender;
  isOffline?: boolean;
  audioPlayed?: boolean;
};

export type LanguageOption = {
  label: string;
  value: string;
  offlineAvailable?: boolean;
};

export const TTS_VOICES = [
  { name: 'Kore', label: 'Kore (Male, Professional)' },
  { name: 'Puck', label: 'Puck (Male, Youthful)' },
  { name: 'Charon', label: 'Charon (Male, Deep)' },
  { name: 'Fenrir', label: 'Fenrir (Male, Rugged)' },
  { name: 'Zephyr', label: 'Zephyr (Female, Warm)' },
] as const;

export type TTSVoice = typeof TTS_VOICES[number]['name'];

// Expanded list of languages (Source selection usually requires BCP-47 codes for Web Speech API)
export const LANGUAGES: LanguageOption[] = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish (Spain)', value: 'es-ES' },
  { label: 'Spanish (Mexico)', value: 'es-MX' },
  { label: 'French (France)', value: 'fr-FR' },
  { label: 'German (Germany)', value: 'de-DE' },
  { label: 'Italian (Italy)', value: 'it-IT' },
  { label: 'Japanese (Japan)', value: 'ja-JP' },
  { label: 'Chinese (Mandarin, Simplified)', value: 'zh-CN' },
  { label: 'Korean (South Korea)', value: 'ko-KR' },
  { label: 'Portuguese (Brazil)', value: 'pt-BR' },
  { label: 'Russian (Russia)', value: 'ru-RU' },
  { label: 'Arabic (Saudi Arabia)', value: 'ar-SA' },
  { label: 'Hindi (India)', value: 'hi-IN' },
  { label: 'Dutch (Netherlands)', value: 'nl-NL' },
  { label: 'Turkish (Turkey)', value: 'tr-TR' },
  { label: 'Vietnamese (Vietnam)', value: 'vi-VN' },
  { label: 'Thai (Thailand)', value: 'th-TH' },
  { label: 'Polish (Poland)', value: 'pl-PL' }
];

export const TARGET_LANGUAGES: LanguageOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Korean', value: 'ko' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Hindi', value: 'hi' }
];
