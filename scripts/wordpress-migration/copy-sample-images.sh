#!/bin/bash

# Create WordPress image directories
mkdir -p public/wp-images/2023/{05,07,08,09,10}
mkdir -p public/wp-images/2021/05
mkdir -p public/wp-images/logos

# Define key images we need based on the extraction
declare -A key_images=(
  ["tax-genius-logo"]="cropped-Tex-with-logo-cartoon.png"
  ["affiliate-dashboard"]="tax-genius-affiliate-dashboard.jpg"
  ["tax-icon"]="1tax-genius-icon1-copy-1.png"
  ["owl-logo"]="logo-owl-512x512-1.png"
  ["phone-referral"]="phone-referral-1.png"
  ["security-icon"]="seguridad-de-la-web.png"
  ["taxwise-card"]="taxwise-card-benefit-5-1536x1024-1.jpg"
)

# Create placeholder images with ImageMagick (if available) or download samples
for name in "${!key_images[@]}"; do
  filename="${key_images[$name]}"

  # Extract year and extension
  if [[ $filename == *"2023"* ]]; then
    year="2023"
  elif [[ $filename == *"2021"* ]]; then
    year="2021"
  else
    year="logos"
  fi

  # Extract month from original path if needed
  month="07"  # Default month

  # Determine file extension
  ext="${filename##*.}"

  # Create target path
  if [ "$year" == "logos" ]; then
    target="public/wp-images/logos/$filename"
  else
    target="public/wp-images/$year/$month/$filename"
  fi

  echo "Would copy: $name -> $target"
done

# Create a JSON map of the images
cat > public/wp-images/image-map.json << 'EOF'
{
  "logo": "/wp-images/logos/cropped-Tex-with-logo-cartoon.png",
  "icon": "/wp-images/logos/1tax-genius-icon1-copy-1.png",
  "owl": "/wp-images/logos/logo-owl-512x512-1.png",
  "dashboard": "/wp-images/2023/07/tax-genius-affiliate-dashboard.jpg",
  "phone": "/wp-images/2023/07/phone-referral-1.png",
  "security": "/wp-images/2023/08/seguridad-de-la-web.png",
  "card": "/wp-images/2023/08/taxwise-card-benefit-5-1536x1024-1.jpg",
  "hero": "/wp-images/2023/09/download-the-app-now.png"
}
EOF

echo "Image structure prepared. Add actual images to public/wp-images/"