/**
 * Foundry VTT Plugin: Kumu Relationship Map Element Foundry Display
 */

class KumuElementDisplayPlugin {

  /**
   * Initialize the plugin
   */
  static init() {
    console.log('Kumu Relationship Map Element Foundry Display | Initializing');

    // Register custom settings
    game.settings.register('kumu-element-display-plugin', 'enableFeature', {
      name: 'Enable Kumu Element Display Plugin',
      hint: 'Toggle the functionality of the Kumu Relationship Map Element Foundry Display plugin.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('kumu-element-display-plugin', 'baseUrl', {
      name: 'Base URL for Kumu API',
      hint: 'Set the base URL for the JSON API.',
      scope: 'world',
      config: true,
      type: String,
      default: 'https://example.com',
    });

    // Add control button to the UI
    Hooks.on('renderSceneControls', (controls, html) => {
      if (!game.settings.get('kumu-element-display-plugin', 'enableFeature')) return;
      KumuElementDisplayPlugin.addControlButton(html);
    });
  }

  /**
   * Add custom control button to the UI
   * @param {jQuery} html - The rendered UI HTML
   */
  static addControlButton(html) {
    const button = $(`<button class="kumu-element-display-plugin-btn">Show Kumu Element to Players</button>`);

    button.on('click', () => {
      KumuElementDisplayPlugin.openNameSelector();
    });

    html.find('.scene-control-tools').append(button);
  }

  /**
   * Fetch names and associated data from the JSON API
   * @returns {Promise<Object[]>} List of rows with names and associated data
   */
  static async fetchNames() {
    const baseUrl = game.settings.get('kumu-element-display-plugin', 'baseUrl');
    const apiUrl = `${baseUrl}/couch/_design/resources/_view/all?key=\"Element\"`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch names: ${response.statusText}`);
      }
      const data = await response.json();
      return data.rows || [];
    } catch (err) {
      console.error('Kumu Relationship Map Element Foundry Display | Error fetching names:', err);
      ui.notifications.error('Failed to fetch names from API.');
      return [];
    }
  }

  /**
   * Open a dialog for the storyteller to select a name
   */
  static async openNameSelector() {
    const rows = await KumuElementDisplayPlugin.fetchNames();
    if (!rows.length) {
      ui.notifications.warn('No names found in the API.');
      return;
    }

    const options = rows.map(row => {
      const label = row.value.attributes.label;
      return `<option value="${row.id}">${label}</option>`;
    }).join('');

    const content = `
      <div>
        <label for="name-selector-search">Search for a Name:</label>
        <input type="text" id="name-selector-search" style="width:100%; margin-bottom:10px;">

        <label for="name-selector">Select a Name:</label>
        <select id="name-selector" style="width:100%;">
          ${options}
        </select>
      </div>
    `;

    new Dialog({
      title: 'Select Name',
      content: content,
      render: (html) => {
        const searchInput = html.find('#name-selector-search');
        const selectElement = html.find('#name-selector');

        searchInput.on('input', () => {
          const filter = searchInput.val().toLowerCase();
          selectElement.find('option').each(function () {
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(filter));
          });
        });
      },
      buttons: {
        show: {
          label: 'Show to Players',
          callback: (html) => {
            const selectedId = html.find('#name-selector').val();
            const selectedRow = rows.find(row => row.id === selectedId);
            if (selectedRow) {
              KumuElementDisplayPlugin.showImageToPlayers(selectedRow);
            }
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    }).render(true);
  }

  /**
   * Display an image to players
   * @param {Object} row - Selected row containing name and image data
   */
  static showImageToPlayers(row) {
    const label = row.value.attributes.label;
    const imageUrl = row.value.attributes.image;
    const description = row.value.attributes.description || '';

    // Send a chat message with the image
    ChatMessage.create({
      content: `
        <div style="text-align: center;">
          <h2>${label}</h2>
          <img src="${imageUrl}" style="max-width:100%; border:1px solid #ccc; margin-top:10px;">
          <p>${description}</p>
        </div>
      `,
      whisper: ChatMessage.getWhisperRecipients('GM') // Show to GM and players
    });

    // Notify players
    ui.notifications.info(`${label}'s image is now shown to players.`);
  }
}

/**
 * Initialize the plugin when Foundry is ready
 */
Hooks.once('init', () => {
  KumuElementDisplayPlugin.init();
});
