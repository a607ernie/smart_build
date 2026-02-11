import React, { useState } from 'react';
import { Material } from '../types';
import { getAllocationSuggestion } from '../services/geminiService';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface AISuggestionProps {
  inventory: Material[];
}

export const AISuggestion: React.FC<AISuggestionProps> = ({ inventory }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const suggestion = await getAllocationSuggestion(query, inventory);
    setResult(suggestion);
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-yellow-300" />
          智慧調配顧問
        </h2>
        <p className="text-indigo-100 mb-6">
          輸入您的材料需求，我將優先建議使用現有的可用餘料以減少浪費。
        </p>
        
        <div className="flex gap-2 bg-white/10 p-1 rounded-xl backdrop-blur-sm border border-white/20">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：我需要 20 支鋼管..."
            className="flex-1 bg-transparent border-none text-white placeholder-indigo-300 focus:ring-0 px-4 py-2"
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '詢問 AI'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`p-4 rounded-lg border-l-4 shadow-sm ${result.isSustainable ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
            <div className="flex items-start gap-3">
              {result.isSustainable ? (
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-1" />
              )}
              <div>
                <h3 className="font-bold text-gray-900 mb-1">
                  {result.summary}
                </h3>
              </div>
            </div>
          </div>

          {result.suggestions?.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700">
                建議調配計畫
              </div>
              <div className="divide-y">
                {result.suggestions.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gray-900 block">{item.materialName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${item.sourceStatus === 'USED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.sourceStatus === 'USED' ? '可用餘料' : '全新庫存'}
                        </span>
                      </div>
                      <span className="text-lg font-mono font-bold text-gray-700">
                        x{item.quantity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{item.action}</p>
                    <p className="text-xs text-gray-500 italic">"{item.reasoning}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
