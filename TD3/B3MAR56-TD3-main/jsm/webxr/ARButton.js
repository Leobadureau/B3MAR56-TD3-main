import { VRButton } from './VRButton.js';

class ARButton {
    static createButton(renderer, options = {}) {
        const button = document.createElement('button');
        button.style.display = 'none';
        button.innerText = 'Enter AR';
        button.id = 'ARButton';

        const onClick = () => {
            if (renderer.xr.isPresenting) {
                renderer.xr.end();
            } else {
                renderer.xr.setReferenceSpaceType(options.referenceSpaceType || 'local');
                renderer.xr.setSession(options.session);
                renderer.xr.start();
            }
        };

        button.addEventListener('click', onClick);

        document.body.appendChild(button);

        return button;
    }
}

export { ARButton };