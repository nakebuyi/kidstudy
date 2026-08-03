/**
 * 判断某个内容序号是否是该科目学习列表中的最后一个。
 *
 * 打卡任务只有在孩子完成整个学习流程（最后一个内容）后才应标记完成，
 * 而不是答完第一道题就完成。该函数用于学习页在每次作答后判断
 * 是否到了触发打卡的时机。
 */
export function isLastLearningItem(charIndex: number, contentLength: number): boolean {
  return contentLength > 0 && charIndex === contentLength - 1;
}
