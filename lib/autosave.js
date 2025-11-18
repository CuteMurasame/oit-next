/*
  autosave.js - 自动保存和恢复管理器
  管理游戏的自动保存、恢复提示和用户偏好设置
*/

(function() {
  // 本地存储键名
  const SAVE_KEY = 'oi_coach_save';  // 使用与游戏相同的存储键
  const AUTOSAVE_PREFERENCE_KEY = 'oi_coach_autosave_preference';
  const AUTOSAVE_TIMESTAMP_KEY = 'oi_coach_autosave_timestamp';
  
  // 恢复偏好设置常量
  const PREFERENCES = {
    AUTO_RESTORE: 'auto_restore',      // 不询问，自动恢复
    ASK_RESTORE: 'ask_restore',        // 询问并恢复（默认）
    NO_RESTORE: 'no_restore'           // 不询问，不恢复
  };

  class AutoSaveManager {
    constructor() {
      this.saveGame = null;  // 将由外部注入
      this.loadGame = null;  // 将由外部注入
      this.renderAll = null; // 将由外部注入
      this.game = null;      // 游戏状态引用
      this.hasShownPrompt = false;  // 标记是否已显示提示
    }

    // 设置回调函数
    setSaveCallback(saveGameFn) {
      this.saveGame = saveGameFn;
    }

    setLoadCallback(loadGameFn) {
      this.loadGame = loadGameFn;
    }

    setRenderCallback(renderAllFn) {
      this.renderAll = renderAllFn;
    }

    setGameReference(gameRef) {
      this.game = gameRef;
    }

    // 获取用户的恢复偏好设置
    getPreference() {
      try {
        const pref = localStorage.getItem(AUTOSAVE_PREFERENCE_KEY);
        return pref || PREFERENCES.ASK_RESTORE;
      } catch (e) {
        console.error('获取自动保存偏好失败:', e);
        return PREFERENCES.ASK_RESTORE;
      }
    }

    // 设置用户的恢复偏好
    setPreference(preference) {
      try {
        if (Object.values(PREFERENCES).includes(preference)) {
          localStorage.setItem(AUTOSAVE_PREFERENCE_KEY, preference);
          return true;
        }
        return false;
      } catch (e) {
        console.error('设置自动保存偏好失败:', e);
        return false;
      }
    }

    // 执行自动保存（使用游戏原有的保存函数）
    autoSave() {
      try {
        if (!this.game) {
          console.warn('游戏状态未初始化，无法自动保存');
          return false;
        }

        // 更新时间戳
        localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, Date.now().toString());
        
        console.log('游戏自动保存成功');
        return true;
      } catch (e) {
        console.error('自动保存失败:', e);
        return false;
      }
    }

    // 检查是否有自动保存数据
    hasAutoSave() {
      try {
        const data = localStorage.getItem(SAVE_KEY);
        return data !== null && data !== '';
      } catch (e) {
        return false;
      }
    }

    // 获取自动保存的时间戳
    getAutoSaveTimestamp() {
      try {
        const timestamp = localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY);
        return timestamp ? parseInt(timestamp) : null;
      } catch (e) {
        return null;
      }
    }

    // 恢复自动保存的游戏
    restoreAutoSave() {
      try {
        const data = localStorage.getItem(SAVE_KEY);
        if (!data) {
          return false;
        }

        // 使用现有的 loadGame 逻辑
        if (this.loadGame && typeof this.loadGame === 'function') {
          return this.loadGame();
        }

        return false;
      } catch (e) {
        console.error('恢复自动保存失败:', e);
        return false;
      }
    }

    // 清除自动保存数据（清除主存档和时间戳）
    clearAutoSave() {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(AUTOSAVE_TIMESTAMP_KEY);
        console.log('自动保存数据已清除');
        return true;
      } catch (e) {
        console.error('清除自动保存数据失败:', e);
        return false;
      }
    }

    // 显示恢复提示对话框
    showRestorePrompt() {
      return new Promise((resolve) => {
        const timestamp = this.getAutoSaveTimestamp();
        const timeStr = timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '未知时间';

        // 创建模态对话框
        const modal = document.createElement('div');
        modal.id = 'autosave-restore-modal';
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        dialog.innerHTML = `
          <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">游戏已自动恢复</h3>
          <p style="margin: 0 0 12px 0; color: #666; line-height: 1.6;">
            检测到上次游戏的自动保存记录（保存时间：${timeStr}）。
          </p>
          <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
            是否要禁用自动恢复功能？
          </p>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="autosave-keep-btn" style="
              padding: 8px 16px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">保持启用</button>
            <button id="autosave-disable-btn" style="
              padding: 8px 16px;
              border: none;
              background: #e53e3e;
              color: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">禁用自动恢复</button>
          </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // 添加按钮事件
        document.getElementById('autosave-keep-btn').onclick = () => {
          modal.remove();
          resolve({ disable: false });
        };

        document.getElementById('autosave-disable-btn').onclick = () => {
          modal.remove();
          resolve({ disable: true });
        };
      });
    }

    // 显示设置对话框
    showSettingsDialog() {
      const currentPref = this.getPreference();
      
      // 获取重置提示偏好
      let resetPromptPref = true;
      try{
        const pref = localStorage.getItem('oi_coach_reset_prompt');
        resetPromptPref = pref === null ? true : pref === 'true';
      }catch(e){}

      // 创建模态对话框
      const modal = document.createElement('div');
      modal.id = 'autosave-settings-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;

      dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">游戏设置</h3>
        
        <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">自动保存</h4>
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 12px; cursor: pointer;">
            <input type="radio" name="autosave-pref" value="${PREFERENCES.AUTO_RESTORE}" 
              ${currentPref === PREFERENCES.AUTO_RESTORE ? 'checked' : ''}>
            <span style="margin-left: 8px; color: #333;">不询问，自动恢复</span>
            <div style="margin-left: 28px; margin-top: 4px; color: #999; font-size: 13px;">
              页面加载时自动恢复上次游戏，不显示提示
            </div>
          </label>
          <label style="display: block; margin-bottom: 12px; cursor: pointer;">
            <input type="radio" name="autosave-pref" value="${PREFERENCES.ASK_RESTORE}" 
              ${currentPref === PREFERENCES.ASK_RESTORE ? 'checked' : ''}>
            <span style="margin-left: 8px; color: #333;">询问并恢复（推荐）</span>
            <div style="margin-left: 28px; margin-top: 4px; color: #999; font-size: 13px;">
              恢复游戏后询问是否要禁用自动恢复
            </div>
          </label>
          <label style="display: block; margin-bottom: 12px; cursor: pointer;">
            <input type="radio" name="autosave-pref" value="${PREFERENCES.NO_RESTORE}" 
              ${currentPref === PREFERENCES.NO_RESTORE ? 'checked' : ''}>
            <span style="margin-left: 8px; color: #333;">不询问，不恢复</span>
            <div style="margin-left: 28px; margin-top: 4px; color: #999; font-size: 13px;">
              禁用自动恢复功能，需要手动开始新游戏
            </div>
          </label>
        </div>
        
        <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">重新开始</h4>
        <div style="margin-bottom: 24px;">
          <label style="display: block; cursor: pointer;">
            <input type="checkbox" name="reset-prompt-pref" ${resetPromptPref ? 'checked' : ''}>
            <span style="margin-left: 8px; color: #333;">重新开始前显示确认提示</span>
            <div style="margin-left: 28px; margin-top: 4px; color: #999; font-size: 13px;">
              点击"重新开始"按钮时显示确认对话框
            </div>
          </label>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="autosave-settings-cancel" style="
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">取消</button>
          <button id="autosave-settings-save" style="
            padding: 8px 16px;
            border: none;
            background: #3182ce;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">保存</button>
        </div>
      `;

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      // 添加按钮事件
      document.getElementById('autosave-settings-cancel').onclick = () => {
        modal.remove();
      };

      document.getElementById('autosave-settings-save').onclick = () => {
        const selectedPref = dialog.querySelector('input[name="autosave-pref"]:checked').value;
        this.setPreference(selectedPref);
        
        // 保存重置提示偏好
        const resetPromptChecked = dialog.querySelector('input[name="reset-prompt-pref"]').checked;
        try{
          localStorage.setItem('oi_coach_reset_prompt', resetPromptChecked ? 'true' : 'false');
        }catch(e){
          console.error('保存重置提示偏好失败:', e);
        }
        
        modal.remove();
        
        // 显示保存成功提示
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #38a169;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 10001;
          font-size: 14px;
        `;
        toast.textContent = '设置已保存';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 2000);
      };
    }

    // 初始化自动保存功能
    init() {
      // 监听页面卸载事件，执行自动保存
      window.addEventListener('beforeunload', () => {
        const pref = this.getPreference();
        // 只有在非"不恢复"模式下才自动保存
        if (pref !== PREFERENCES.NO_RESTORE && this.game) {
          // 使用游戏原有的保存系统
          if (this.saveGame && typeof this.saveGame === 'function') {
            this.saveGame(true);  // silent mode
          }
          this.autoSave();
        }
      });

      // 定期自动保存（每30秒）
      setInterval(() => {
        const pref = this.getPreference();
        if (pref !== PREFERENCES.NO_RESTORE && this.game) {
          if (this.saveGame && typeof this.saveGame === 'function') {
            this.saveGame(true);  // silent mode
          }
          this.autoSave();
        }
      }, 30000);

      console.log('自动保存管理器已初始化');
    }

    // 在页面加载时处理恢复逻辑
    async handleRestore() {
      const pref = this.getPreference();
      
      // 如果设置为不恢复，直接返回
      if (pref === PREFERENCES.NO_RESTORE) {
        console.log('自动恢复已禁用');
        return false;
      }

      // 检查是否有自动保存
      if (!this.hasAutoSave()) {
        console.log('没有找到自动保存数据');
        return false;
      }

      // 恢复游戏
      const restored = this.restoreAutoSave();
      if (!restored) {
        console.error('恢复游戏失败');
        return false;
      }

      // 如果需要渲染，调用渲染函数
      if (this.renderAll && typeof this.renderAll === 'function') {
        this.renderAll();
      }

      // 如果设置为询问模式且还没显示过提示，显示提示
      if (pref === PREFERENCES.ASK_RESTORE && !this.hasShownPrompt) {
        this.hasShownPrompt = true;
        const result = await this.showRestorePrompt();
        if (result.disable) {
          this.setPreference(PREFERENCES.NO_RESTORE);
        }
      }

      return true;
    }
  }

  // 导出到全局作用域
  window.AutoSaveManager = AutoSaveManager;
  window.autoSaveManager = new AutoSaveManager();

})();
