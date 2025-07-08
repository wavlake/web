#!/bin/bash

# Feature Development Setup Script
# Usage: ./setup-feature.sh "Feature Name" "feature-branch-name"

set -e

# Check if required arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 \"Feature Name\" \"feature-branch-name\""
    echo "Example: $0 \"Enhanced Authentication\" \"auth-updates\""
    exit 1
fi

FEATURE_NAME="$1"
FEATURE_BRANCH="$2"
FEATURE_KEBAB=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
FEATURE_SNAKE=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
FEATURE_UPPER=$(echo "$FEATURE_NAME" | tr '[:lower:]' '[:upper:]' | sed 's/ /_/g')

echo "🚀 Setting up feature: $FEATURE_NAME"
echo "📁 Branch: $FEATURE_BRANCH"
echo "🔗 Kebab case: $FEATURE_KEBAB"

# Create feature branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/$FEATURE_BRANCH; then
    echo "🌿 Creating branch: $FEATURE_BRANCH"
    git checkout -b $FEATURE_BRANCH
else
    echo "✅ Branch $FEATURE_BRANCH already exists"
fi

# Create worktree
WORKTREE_PATH="../$FEATURE_KEBAB-worktree"
if [ -d "$WORKTREE_PATH" ]; then
    echo "⚠️  Worktree already exists at $WORKTREE_PATH"
    read -p "Remove existing worktree? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git worktree remove "$WORKTREE_PATH" 2>/dev/null || rm -rf "$WORKTREE_PATH"
        echo "🗑️  Removed existing worktree"
    else
        echo "❌ Keeping existing worktree, skipping creation"
        WORKTREE_PATH=""
    fi
fi

if [ -n "$WORKTREE_PATH" ]; then
    echo "🌳 Creating worktree: $WORKTREE_PATH"
    git worktree add "$WORKTREE_PATH" "$FEATURE_BRANCH"
fi

# Create feature documentation from template
MASTER_TODO="${FEATURE_UPPER}_MASTER_TODO.md"
IMPL_PLAN="${FEATURE_UPPER}_IMPLEMENTATION_PLAN.md"
UX_FLOWS="${FEATURE_UPPER}_UX_FLOWS.md"

echo "📝 Creating documentation files..."

# Create master todo
if [ ! -f "$MASTER_TODO" ]; then
    cp FEATURE_DEVELOPMENT_TEMPLATE.md "$MASTER_TODO"
    
    # Replace placeholders
    sed -i.bak "s/\[FEATURE_NAME\]/$FEATURE_NAME/g" "$MASTER_TODO"
    sed -i.bak "s/\[feature-name\]/$FEATURE_KEBAB/g" "$MASTER_TODO"
    sed -i.bak "s/\[feature-branch-name\]/$FEATURE_BRANCH/g" "$MASTER_TODO"
    sed -i.bak "s/\[FEATURE_NAME\]/$FEATURE_UPPER/g" "$MASTER_TODO"
    sed -i.bak "s/\[Date\]/$(date +%Y-%m-%d)/g" "$MASTER_TODO"
    rm "$MASTER_TODO.bak"
    
    echo "✅ Created $MASTER_TODO"
else
    echo "⚠️  $MASTER_TODO already exists"
fi

# Create implementation plan template
if [ ! -f "$IMPL_PLAN" ]; then
    cat > "$IMPL_PLAN" << EOF
# $FEATURE_NAME Implementation Plan

## 🎯 Overview

This plan implements $FEATURE_NAME for Wavlake, including:

- [Key implementation detail 1]
- [Key implementation detail 2]
- [Key implementation detail 3]

## 📊 Current State Analysis

### ✅ Already Implemented:
- [Existing capability 1]
- [Existing capability 2]

### 🔄 What We Need to Build:
- [New capability 1]
- [New capability 2]

## 🛠️ Implementation Plan

### **Phase 1: [Phase Name]**

#### **Component 1** - NEW
**Purpose**: [Description]

\`\`\`typescript
// Implementation example
\`\`\`

#### **Component 2** - ENHANCED
**Purpose**: [Description]

## 📁 File Structure

\`\`\`
src/
├── components/
│   ├── [feature]/
│   │   ├── Component1.tsx           # NEW
│   │   ├── Component2.tsx           # NEW
│   │   └── Component3.tsx           # ENHANCED
├── hooks/
│   ├── use${FEATURE_NAME// /}.ts    # NEW
│   └── use${FEATURE_NAME// /}Status.ts  # NEW
└── pages/
    └── [FeaturePage].tsx            # MODIFIED
\`\`\`

## 🎯 Success Metrics

- [Success criteria 1]
- [Success criteria 2]
- [Success criteria 3]
EOF
    
    echo "✅ Created $IMPL_PLAN"
else
    echo "⚠️  $IMPL_PLAN already exists"
fi

# Create UX flows template
if [ ! -f "$UX_FLOWS" ]; then
    cat > "$UX_FLOWS" << EOF
# $FEATURE_NAME User Experience Flows

## 🎯 Overview

This document details the complete user experience for $FEATURE_NAME. Each flow shows the exact screens, decisions, and outcomes users will encounter.

## 🚀 **Flow 1: [Primary Flow Name]**

### **User Profile**: [User type]
### **Goal**: [User goal]

### **UX Path**:
\`\`\`
1. Starting Point
   ┌─────────────────────────────────┐
   │  [Screen Description]           │
   │                                 │
   │  [Button/Action]                │  ← USER CLICKS
   │  [Other Options]                │
   └─────────────────────────────────┘

2. Next Step
   ┌─────────────────────────────────┐
   │  [Screen Description]           │
   │                                 │
   │  [Form/Input Fields]            │
   │                                 │
   │  [Continue] [Cancel]            │
   └─────────────────────────────────┘
\`\`\`

### **Key UX Points**:
- [UX consideration 1]
- [UX consideration 2]
- [UX consideration 3]

## 🎯 **UX Design Principles**

### **1. [Principle Name]**
- [Description]

### **2. [Principle Name]**
- [Description]
EOF
    
    echo "✅ Created $UX_FLOWS"
else
    echo "⚠️  $UX_FLOWS already exists"
fi

# Summary
echo ""
echo "🎉 Feature setup complete!"
echo ""
echo "📋 Created files:"
echo "   - $MASTER_TODO"
echo "   - $IMPL_PLAN"
echo "   - $UX_FLOWS"
echo ""
if [ -n "$WORKTREE_PATH" ]; then
    echo "🌳 Worktree created at: $WORKTREE_PATH"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. cd $WORKTREE_PATH"
    echo "   2. Edit the documentation files to match your feature"
    echo "   3. Use: /work https://github.com/wavlake/web/issues/[issue-number]"
    echo ""
    echo "🔧 The /work command will automatically:"
    echo "   - Use branch: $FEATURE_BRANCH"
    echo "   - Load context from: $MASTER_TODO"
    echo "   - Work in isolated worktree environment"
fi