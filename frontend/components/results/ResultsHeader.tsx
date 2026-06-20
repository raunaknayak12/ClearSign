import React from 'react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import type { ClauseType } from '@/types';

export interface Category {
  label: string;
  count: number;
  color: 'blue' | 'red' | 'yellow' | 'orange';
  type: ClauseType;
}

interface ResultsHeaderProps {
  documentTitle: string;
  documentSubtitle: string;
  clausesCount: number;
  needReviewCount: number;
  categories: Category[];
  isComplete: boolean;
  onBack?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  activeCategoryFilter?: ClauseType | null;
  onCategoryFilter?: (type: ClauseType) => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  documentTitle,
  documentSubtitle,
  clausesCount,
  needReviewCount,
  categories,
  isComplete,
  activeCategoryFilter,
  onCategoryFilter,
}) => {
  const getCategoryColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 bg-blue-50 hover:bg-blue-100';
      case 'red':
        return 'text-red-600 bg-red-50 hover:bg-red-100';
      case 'yellow':
        return 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100';
      case 'orange':
        return 'text-orange-600 bg-orange-50 hover:bg-orange-100';
      default:
        return 'text-slate-600 bg-slate-50 hover:bg-slate-100';
    }
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 relative transition-colors duration-200">
      <div className="max-w-[800px] mx-auto w-full px-4 md:px-8 py-6">
        {/* Top Row - Title */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="min-w-0"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl font-semibold text-slate-900 font-mono leading-tight truncate"
            >
              {documentTitle}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-sm text-slate-500 mt-1 font-mono"
            >
              {documentSubtitle}
            </motion.p>
          </motion.div>
        </div>

        {/* Stats and Categories Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-6 sm:gap-12 pt-2 border-t border-slate-100">
          {/* Clauses Count */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, type: 'spring', stiffness: 100, damping: 10 }}
            className="text-center sm:text-left shrink-0"
          >
            <div className="text-3xl font-semibold text-slate-900 font-mono leading-none">
              {clausesCount}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-mono uppercase tracking-wider">
              Clauses
            </div>
          </motion.div>

          {/* Categories */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 font-mono text-center sm:text-left"
            >
              Categories
            </motion.div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {categories.length > 0 ? (
                categories.map((category, index) => {
                  const isActive = activeCategoryFilter === category.type;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 1.0 + index * 0.1,
                        duration: 0.6,
                        type: 'spring',
                        stiffness: 100,
                        damping: 10,
                      }}
                    >
                      <button
                        onClick={() => onCategoryFilter?.(category.type)}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant="secondary"
                          className={`px-3 py-1.5 rounded-full border-0 font-medium font-mono cursor-pointer transition-all ${
                            getCategoryColor(category.color)
                          } ${isActive ? 'ring-2 ring-offset-1 ring-current opacity-100 scale-105' : 'opacity-80 hover:opacity-100'}`}
                        >
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2" />
                          {category.label} ×{category.count}
                        </Badge>
                      </button>
                    </motion.div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400 italic mt-1 font-mono">
                  No categories loaded yet
                </span>
              )}
            </div>
          </div>

          {/* Need Review Count */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6, type: 'spring', stiffness: 100, damping: 10 }}
            className="text-center sm:text-right shrink-0"
          >
            <div className="text-3xl font-semibold text-red-600 font-mono leading-none">
              {needReviewCount}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-mono uppercase tracking-wider">
              Need review
            </div>
          </motion.div>
        </div>
      </div>

      {/* Indeterminate linear shimmer bar at the bottom border if processing */}
      {!isComplete && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
          <div className="h-full bg-primary w-[40%] rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};
