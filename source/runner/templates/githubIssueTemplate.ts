import { DangerResults } from "../../dsl/DangerResults"
import { Violation, isInline } from "../../dsl/Violation"

/**
 * Converts a set of violations into a HTML table
 *
 * @param {string} name User facing title of table
 * @param {string} defaultEmoji Emoji name to show next to each item
 * @param {Violation[]} violations for table
 * @returns {string} HTML
 */
function table(name: string, defaultEmoji: string, violations: Violation[]): string {
  if (noViolationsOrAllOfThemEmpty(violations)) {
    return ""
  }
  return `
<table>
  <thead>
    <tr>
      <th width="50"></th>
      <th width="100%" data-danger-table="true">${name}</th>
    </tr>
  </thead>
  <tbody>${violations.map(violation => htmlForValidation(defaultEmoji, violation)).join("\n")}</tbody>
</table>
`
}

function htmlForValidation(defaultEmoji: string, violation: Violation) {
  let message = isInline(violation)
    ? `**${violation.file!}#L${violation.line!}** - ${violation.message}`
    : violation.message

  if (containsMarkdown(message)) {
    message = `\n\n  ${message}\n  `
  }

  const emojiString = `:${defaultEmoji}:`;

  return `<tr>
      <td>${violation.icon || emojiString}</td>
      <td>${message}</td>
    </tr>
  `
}

function containsMarkdown(message: string): boolean {
  return message.match(/[`*_~\[]+/g) ? true : false
}

function noViolationsOrAllOfThemEmpty(violations: Violation[]) {
  return violations.length === 0 || violations.every(violation => !violation.message)
}

const truncate = (msg: string, count: number) => {
  if (!msg) {
    return msg
  }
  if (msg.length < count) {
    return msg
  } else {
    return msg.substr(0, count - 3) + "..."
  }
}

function getSummary(label: string, violations: Violation[]): string {
  return violations
    .map(x => truncate(x.message, 20))
    .reduce(
      (acc, value, idx) => `${acc} ${value}${idx === violations.length - 1 ? "" : ","}`,
      `${violations.length} ${label}: `
    )
}

function buildSummaryMessage(dangerID: string, results: DangerResults): string {
  const { fails, warnings, messages, markdowns } = results
  const summary = `  ${getSummary("failure", fails)}
  ${getSummary("warning", warnings)}
  ${messages.length > 0 ? `${messages.length} messages` : ""}
  ${markdowns.length > 0 ? `${markdowns.length} markdown notices` : ""}
  ${dangerIDToString(dangerID)}`
  return summary
}

export const dangerIDToString = (id: string) => `DangerID: danger-id-${id};`
export const fileLineToString = (file: string, line: number) => `  File: ${file};
  Line: ${line};`

export const dangerSignature = (results: DangerResults) => {
  let meta = results.meta || { runtimeName: "dangerJS", runtimeHref: "https://danger.systems/js" }

  return `Generated by :no_entry_sign: <a href="${meta.runtimeHref}">${meta.runtimeName}</a>`
}

/**
 * Postfix signature to be attached comment generated / updated by danger.
 */
export const dangerSignaturePostfix = (results: DangerResults, commitID?: string) => {
  let signature = dangerSignature(results)
  if (commitID !== undefined) {
    signature = `${signature} against ${commitID}`
  }
  return signature
}

/**
 * Comment to add when updating the PR status when issues are found
 */
export const messageForResultWithIssues = `Found some issues. Don't worry, everything is fixable.`

/**
 * A template function for creating a GitHub issue comment from Danger Results
 * @param {string} dangerID A string that represents a unique build
 * @param {DangerResults} results Data to work with
 * @param {string} commitID The hash that represents the latest commit
 * @returns {string} HTML
 */
export function template(dangerID: string, results: DangerResults, commitID?: string): string {
  return `
<!--
${buildSummaryMessage(dangerID, results)}
-->
${table("Fails", "no_entry_sign", results.fails)}
${table("Warnings", "warning", results.warnings)}
${table("Messages", "book", results.messages)}
${results.markdowns.map(v => v.message).join("\n\n")}
<p align="right">
  ${dangerSignaturePostfix(results, commitID)}
</p>
`
}

export function inlineTemplate(dangerID: string, results: DangerResults, file: string, line: number): string {
  const printViolation = (defaultEmoji: string) => (violation: Violation) => {
    const emojiString = `:${defaultEmoji}:`;
    return `- ${violation.icon || emojiString} ${violation.message}`
  }

  return `
<!--
${buildSummaryMessage(dangerID, results)}
${fileLineToString(file, line)}
-->
${results.fails.map(printViolation("no_entry_sign")).join("\n")}
${results.warnings.map(printViolation("warning")).join("\n")}
${results.messages.map(printViolation("book")).join("\n")}
${results.markdowns.map(v => v.message).join("\n\n")}
  `
}
