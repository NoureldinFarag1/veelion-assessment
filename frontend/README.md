# VeeLion Frontend Assessment (Next.js)

## Overview

You are given a partially implemented frontend for a **Task Management System** built with Next.js.

The project contains **two modules**:

* A **Task Dashboard**
* An **Activity Feed**

Your goal is to:

1. Review the existing implementation
2. Identify good and bad practices
3. Improve the problematic module
4. Build a new feature that integrates with the system

---

## Objectives

This assessment evaluates your ability to:

* Understand existing React/Next.js code
* Identify code quality issues
* Refactor UI code effectively
* Build maintainable components
* Integrate with APIs

---

## What You Are Given

* Next.js (App Router) project
* Two modules/pages:

  * Task Dashboard
  * Activity Feed

---

## Your Tasks

### 1. Code Review

Create a file named:

```
REVIEW.md
```

Include:

* All the findings / issues you may want to discuss
* Categorize issues such as:

  * Performance
  * Maintainability
  * UX issues
  * Code quality
  * React best practices

For each issue:

* What is wrong
* Why it matters
* Suggested improvement

---

### 2. Refactor Both Modules

Improve the existing modules

**Important**:

* Don't rewrite everything from scratch
* Maintain existing functionality

---


### 3. Build a New Module (Reports UI)

Create a new page:

```
/reports
```

### Requirements:

Display:

* Total number of tasks
* Tasks grouped by status
* Recent activity count

### Expectations:

* Fetch data from the Reports API
* Use clean component structure
* Handle loading and error states
* Keep UI simple but clear

---

## Constraints

* Keep components reusable and clean
* Assume this is part of a real production app

---

### 4. Improve the current UI

Improve the existing UI, it currently uses basic CSS styling.
Use your eye and style the pages beautifully.


---

## Submission Instructions

1. Create a **public GitHub repository**

2. Push your solution

3. Include:

   * Updated code
   * `REVIEW.md`
   * Clean commit history

4. Share the repository link

---

## ⏱Time Expectation

* Expected time: **~2 days**

---

## AI Usage

You are allowed to use AI tools, but not copy-pasting this document and just pushing the output.

We are evaluating:

* How you reason about code
* Your ability to identify issues
* Your improvements, not just generated code

---




## Project Notes

- The frontend uses Next.js App Router with TypeScript.
- Route handlers under `app/api/*` proxy requests to backend.
- Backend endpoint docs are in `docs/backend-endpoints.md`.
- Backend installation notes are in `/backend/README.md`.
