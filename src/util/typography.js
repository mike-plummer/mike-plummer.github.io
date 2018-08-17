import Typography from 'typography';
import grandViewTheme from 'typography-theme-grand-view';
import CodePlugin from 'typography-plugin-code';

grandViewTheme.plugins = [new CodePlugin()];

export default new Typography(grandViewTheme);
